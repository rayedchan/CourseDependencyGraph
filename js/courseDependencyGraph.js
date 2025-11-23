// Characteristics of Node and Edges
var LOGICAL_AND_EDGE_COLOR = "black";
var LOGICAL_OR_EDGE_COLOR = "orange";
var NODE_SHAPE = "dot";

// Possible states of a node
var UNAVALIABLE_STATE = 0; // Grey Node or Non-Existent Node
var COMPLETED_STATE = 1; // Green Node
var READY_STATE = 2; // Blue Node
var UNAVALIABLE_STATE_COLOR = "#bdbdbd"; //"grey";
var COMPLETED_STATE_COLOR = "#16a34a"; // "green";
var READY_STATE_COLOR = "#2563eb"; // "blue";

// Mapping state to corresponding color
var numToColorMapping = {}; // new object
numToColorMapping[UNAVALIABLE_STATE] = UNAVALIABLE_STATE_COLOR;
numToColorMapping[COMPLETED_STATE] = COMPLETED_STATE_COLOR;
numToColorMapping[READY_STATE] = READY_STATE_COLOR;

// Path to academic major JSON files
var CHEMISTRY_JSON_FILE = "json/chemistry.json";
var COMPUTER_SCIENCE_JSON_FILE = "json/computerscience.json";
var ECONOMICS_JSON_FILE = "json/economics.json";
var MATHEMATICS_JSON_FILE = "json/mathematics.json";
var PSYCHOLOGY_JSON_FILE = "json/psychology.json";

// This object represents the graph to built
var particleSystem = initializeParticleSystem(); // method call creates particle system; the particle system template is used throughout

/*
 * Execute code when DOM is fully loaded.
 * Main method
 */
$(document).ready(function () {
  // Get the initial value of selection option
  var $acadMajor = $("#academicMajor"); // "$" used here refers to the jQuery object representation of the dom object

  // Store the initial major as the old value
  $acadMajor.data("oldVal", $acadMajor.val());

  // Initial academic major on landing page
  $.builtSystem(COMPUTER_SCIENCE_JSON_FILE);

  // Executed whenever an academic major changes
  $acadMajor.change(function () {
    var prevAcadMajorJSON = $(this).data("oldVal"); // Fetch the previous academic major
    var newAcadMajorJSON = $(this).val(); // Get the new selected academic major
    $.clearCourseButtons(); // Clear the previous academic major courses
    $.clearParticleSystem(prevAcadMajorJSON); // Clear the previous academic major by removing the objects within the particle system
    $.builtSystem(newAcadMajorJSON); // Add the new academic major objects into the particle system
    $acadMajor.data("oldVal", newAcadMajorJSON); // Store new json file as old value
  });
});

/*
 * Dynamically renders the content of the page.
 * @param -
 *       jsonFile - path of json file. This json file contains data of a single academic major.
 */
(function ($) {
  $.builtSystem = function (jsonFile) {
    particleSystem.renderer = Renderer("#viewport");

    var courseArray;
    var outgoingEdgeGraphArray = {};
    var nodeStateArray = {};

    $.ajax({
      url: jsonFile,
      async: false,
      dataType: "json",
      success: function (json) {
        courseArray = json;
      },
    });

    $.determineAllOutgoingEdges(courseArray, outgoingEdgeGraphArray);

    // expose current model so sidepanel handlers can call changeNodeState
    window.currentCDG = {
      courseArray: courseArray,
      outgoingEdgeGraphArray: outgoingEdgeGraphArray,
      nodeStateArray: nodeStateArray,
    };

    // Trigger Event buttons
    document.getElementById("displayEntireDependencyGraph").onclick =
      function () {
        $.createEntireCourseDependencyGraph(courseArray, nodeStateArray);
      };
    document.getElementById("clearGraph").onclick = function () {
      $.clearEntireGraph(courseArray, nodeStateArray);
    };

    // Prepare sidepanel containers
    var completedList = document.getElementById("completedList");
    var courseButtons = document.getElementById("courseButtons"); // remaining list container

    // ensure containers exist (clear previous)
    if (completedList) completedList.innerHTML = "";
    if (courseButtons) courseButtons.innerHTML = "";

    // helper to render a remaining course card (as button)
    function makeRemainingCard(code, displayName, prereqText) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "course-card remaining";
      button.setAttribute("data-course", code);
      button.setAttribute("aria-disabled", "false");

      var title = document.createElement("div");
      title.className = "course-card-title";
      title.textContent = code + " — " + displayName;

      var prereq = document.createElement("div");
      prereq.className = "course-card-prereq";
      prereq.textContent = prereqText || "";

      button.appendChild(title);
      button.appendChild(prereq);

      // click selects the course (adds to completed)
      button.addEventListener("click", function (e) {
        e.preventDefault();

        var ctx = window.currentCDG;
        if (!ctx) return;

        $.changeNodeState(
          ctx.courseArray,
          ctx.outgoingEdgeGraphArray,
          ctx.nodeStateArray,
          code
        );

        // after state change, if completed move to completed list
        var newState = ctx.nodeStateArray[code];
        if (newState === COMPLETED_STATE) {
          moveToCompleted(button, code);
        } else {
          ensureInRemaining(button);
        }
      });

      return button;
    }

    // helper to render a completed small item (clickable to remove)
    function makeCompletedItem(code) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "completed-item";
      button.setAttribute("data-course", code);
      button.textContent = code;

      // clicking completed removes (undo) using existing logic
      button.addEventListener("click", function (e) {
        e.preventDefault();
        var ctx = window.currentCDG;
        if (!ctx) return;
        $.changeNodeState(
          ctx.courseArray,
          ctx.outgoingEdgeGraphArray,
          ctx.nodeStateArray,
          code
        );

        // after change, if not completed put back to remaining
        var newState = ctx.nodeStateArray[code];
        if (newState !== COMPLETED_STATE) {
          moveToRemaining(button, code);
        }
      });

      return button;
    }

    function moveToCompleted(cardElement, code) {
      // remove any extra content and render small completed item
      if (cardElement && cardElement.parentNode)
        cardElement.parentNode.removeChild(cardElement);

      var completedItem = makeCompletedItem(code);
      if (completedList) completedList.appendChild(completedItem);

      // update classes
      setCourseClass(code, "completedState");

      // re-evaluate all remaining courses after completing one
      if (typeof $.syncRemainingCardsUI === "function") {
        $.syncRemainingCardsUI(courseArray, nodeStateArray);
      }
    }

    function ensureInRemaining(cardElement) {
      if (!courseButtons) return;
      if (!cardElement.parentNode) courseButtons.appendChild(cardElement);
      setCourseClass(cardElement.getAttribute("data-course"), "readyState");
    }

    function moveToRemaining(completedElementOrCode, codeIfNeeded) {
      var code =
        codeIfNeeded ||
        (completedElementOrCode &&
          completedElementOrCode.getAttribute &&
          completedElementOrCode.getAttribute("data-course"));
      // remove completed element from DOM if passed element
      if (
        completedElementOrCode &&
        completedElementOrCode.parentNode &&
        typeof completedElementOrCode.textContent === "string"
      ) {
        completedElementOrCode.parentNode.removeChild(completedElementOrCode);
      } else {
        // try to remove by selector
        var el = document.querySelector(
          '#completedList [data-course="' + code + '"]'
        );
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }

      if (!courseButtons) return;

      // recreate remaining card
      var displayName =
        courseArray[code] && courseArray[code].Name
          ? courseArray[code].Name
          : "";

      // Build prereq text same way as initial card generation
      var prereqText = "";
      var preq = courseArray[code].Prerequisite;
      if (preq && preq.length > 0) {
        for (var i = 0; i < preq.length; i++) {
          if (i > 0) prereqText += " • ";
          if (preq[i] instanceof Array) {
            prereqText += "(" + preq[i].join(" or ") + ")";
          } else {
            prereqText += preq[i];
          }
        }
      }

      var card = makeRemainingCard(code, displayName, prereqText);

      // find the correct insertion position based on courseArray order
      var allCodes = Object.keys(courseArray);
      var targetIndex = allCodes.indexOf(code);
      var inserted = false;

      if (targetIndex >= 0) {
        // loop through existing cards and find where to insert
        var existingCards = courseButtons.querySelectorAll("[data-course]");
        for (var i = 0; i < existingCards.length; i++) {
          var existingCode = existingCards[i].getAttribute("data-course");
          var existingIndex = allCodes.indexOf(existingCode);
          if (existingIndex > targetIndex) {
            // insert before this card
            courseButtons.insertBefore(card, existingCards[i]);
            inserted = true;
            break;
          }
        }
      }

      // if not inserted yet (no suitable position found), append to end
      if (!inserted) {
        courseButtons.appendChild(card);
      }

      // Don't assume this course is ready - let syncRemainingCardsUI evaluate it
      // along with all other courses that may have been affected
      if (typeof $.syncRemainingCardsUI === "function") {
        $.syncRemainingCardsUI(courseArray, nodeStateArray);
      }
    }

    // Dynamically generate course cards
    for (var courseCode in courseArray) {
      var displayName = courseArray[courseCode].Name || "";
      var prerequisiteObj = courseArray[courseCode].Prerequisite;
      var prerequisiteString = "";
      if (!(typeof prerequisiteObj === "undefined")) {
        // produce a short textual summary
        for (var i = 0; i < prerequisiteObj.length; i++) {
          if (i > 0) prerequisiteString += " • ";
          if (prerequisiteObj[i] instanceof Array)
            prerequisiteString += "(" + prerequisiteObj[i].join(" or ") + ")";
          else prerequisiteString += prerequisiteObj[i];
        }
      }

      // Create hidden legacy input for compatibility (kept but visually hidden)
      var hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = courseCode;
      // still attach legacy onclick to maintain particle system behaviour if other code triggers it
      hiddenInput.onclick = (function (c) {
        return function () {
          $.changeNodeState(
            courseArray,
            outgoingEdgeGraphArray,
            nodeStateArray,
            c
          );
        };
      })(courseCode);
      document.body.appendChild(hiddenInput);

      // create remaining card and append
      var card = makeRemainingCard(courseCode, displayName, prerequisiteString);
      if (courseButtons) courseButtons.appendChild(card);

      // initial state: root nodes become ready
      var doesCourseHavePrereq =
        typeof prerequisiteObj === "undefined" ? false : true;
      if (!doesCourseHavePrereq) {
        setCourseClass(courseCode, "readyState");
        nodeStateArray[courseCode] = READY_STATE;
      } else {
        setCourseClass(courseCode, "inactiveState");
      }
    }

    $.initializeGraph(courseArray, nodeStateArray);
  };
})(jQuery);

/*
 * Initialize the Particle System.
 * This is used to display the course dependency graph.
 * @return - particle system object
 */
function initializeParticleSystem() {
  /* Parameters for the Particle System.
   * The Particle System is used to represent the course dependency graph.
   * Below the parameters of the Particle System constructor.
   *      repulsion - the force repelling nodes from each other
   *      stiffness - the rigidity of the edges
   *      friction - the amount of damping in the system
   *      gravity - an addtional force attracting nodes to the orgin
   *      fps - frames per second
   *      dt - timestep to use for steeping the simulation
   *      precision - accuracy vs. speed in force calculations
   */
  var repulsionValue = 1000;
  var stiffnessValue = 200;
  var frictionValue = 0.5;
  var gravityValue = true;
  var fpsValue = 40;
  var dtValue = 0.02;
  var precisionValue = 0.6;

  //call constructor to create the Particle System
  //The user will be able to interact and modify this particle system.
  var particleSystem = arbor.ParticleSystem({
    repulsion: repulsionValue,
    stiffness: stiffnessValue,
    friction: frictionValue,
    gravity: gravityValue,
    fps: fpsValue,
    dt: dtValue,
    precision: precisionValue,
  });

  return particleSystem;
}

/*
 * Clears the previous particle system.
 * @param
 *      prevAcadMajorJSON - Name of the previous major JSON file selected
 */
(function ($) {
  $.clearParticleSystem = function (prevAcadMajorJSON) {
    var prevCourseArray;

    $.ajax({
      url: prevAcadMajorJSON, //url: path to json file
      async: false, //async: function gets called in sequence with code, so var courseArray is populated
      dataType: "json", //json data
      success: function (json) {
        prevCourseArray = json;
      }, //sets courseArray with json data
    });

    //Iterate all courses in major
    for (var key in prevCourseArray) {
      var currentNodeId = key; //String Identifier of current node

      //determine if node exist in Particle system
      if ($.doesNodeExist(currentNodeId))
        particleSystem.pruneNode(currentNodeId); //Removes the corresponding Node from the particle system (as well as any Edges in which it is a participant).
    }
  };
})(jQuery);

/*
 * Initialize the default state of the course dependency graph.
 * This adds the root nodes, which are courses with no dependency.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      nodeStateArray - keeps track of the state of each node in current graph
 */
(function ($) {
  $.initializeGraph = function (courseArray, nodeStateArray) {
    //Iterate through each course of an academic major
    for (var courseCode in courseArray) {
      var courseObj = courseArray[courseCode]; //get course info
      var doesCourseHavePrereq =
        typeof courseObj.Prerequisite === "undefined" ? false : true; //determine if this course has prerequisites

      if (!doesCourseHavePrereq) {
        $.addNode(courseCode, READY_STATE_COLOR); //add course that has no dependency into graph
        nodeStateArray[courseCode] = READY_STATE; //mark course as "Ready" state
        setCourseClass(courseCode, "readyState");
      }
    }
  };
})(jQuery);

/*
 * Reset Graph (Particle System) to its default state.
 * Removes all the nodes and edges. Adds the root nodes.
 * Moves completed courses back to remaining section.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      nodeStateArray - keeps track of the state of each node in current graph
 */
(function ($) {
  $.clearEntireGraph = function (courseArray, nodeStateArray) {
    // Simply clear both sections - $.builtSystem will rebuild everything
    var completedList = document.getElementById("completedList");
    var courseButtons = document.getElementById("courseButtons");

    if (completedList) completedList.innerHTML = "";
    if (courseButtons) courseButtons.innerHTML = "";

    //Clear nodeStateArray
    for (var code in nodeStateArray) {
      delete nodeStateArray[code]; //delete the element/property in object
    }

    //Iterate all courses in major
    for (var key in courseArray) {
      $("#" + key + "Undo").addClass("hidden"); //hide undo button
      // Remove hidden input elements that were created
      var hiddenInput = document.getElementById(key);
      if (hiddenInput && hiddenInput.parentNode) {
        hiddenInput.parentNode.removeChild(hiddenInput);
      }

      //determine if node exist in Particle system
      if ($.doesNodeExist(key)) particleSystem.pruneNode(key);
    }

    // Rebuild the entire system from scratch with fresh handlers
    // This is cleaner than trying to patch up stale handlers
    var currentMajor = $("#academicMajor").val();
    $.builtSystem(currentMajor);
  };
})(jQuery);

/*
 * Create the entire course dependency graph of an academic major.
 * Marks all courses as completed and moves them to the completed section.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      nodeStateArray - keeps track of the state of each node in current graph
 */
(function ($) {
  $.createEntireCourseDependencyGraph = function (courseArray, nodeStateArray) {
    // Clear particle system but don't rebuild - we'll build the full graph
    for (var code in nodeStateArray) {
      delete nodeStateArray[code];
    }
    for (var key in courseArray) {
      if ($.doesNodeExist(key)) particleSystem.pruneNode(key);
    }

    $.createAllNodesForDependencyGraph(courseArray); //create all nodes; each node start off as a singleton
    $.addDependencyEdges(courseArray); //adds the dependency edges

    // Mark all courses as completed and move to completed section
    var completedList = document.getElementById("completedList");
    var courseButtons = document.getElementById("courseButtons");

    if (completedList && courseButtons) {
      // Clear both sections
      completedList.innerHTML = "";

      // Get all remaining cards
      var remainingCards = courseButtons.querySelectorAll("[data-course]");
      var courseCodes = [];
      for (var i = 0; i < remainingCards.length; i++) {
        courseCodes.push(remainingCards[i].getAttribute("data-course"));
      }

      // Clear remaining section
      courseButtons.innerHTML = "";

      // Helper function to create a remaining card (reuse logic from $.builtSystem)
      function makeRemainingCardForFullGraph(code, displayName, prereqText) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "course-card remaining";
        button.setAttribute("data-course", code);
        button.setAttribute("aria-disabled", "false");

        var title = document.createElement("div");
        title.className = "course-card-title";
        title.textContent = code + " — " + displayName;

        var prereq = document.createElement("div");
        prereq.className = "course-card-prereq";
        prereq.textContent = prereqText || "";

        button.appendChild(title);
        button.appendChild(prereq);

        // click handler to add course to completed
        button.addEventListener("click", function (e) {
          e.preventDefault();
          var ctx = window.currentCDG;
          if (!ctx) return;
          var courseCode = this.getAttribute("data-course");

          $.changeNodeState(
            ctx.courseArray,
            ctx.outgoingEdgeGraphArray,
            ctx.nodeStateArray,
            courseCode
          );

          // If now completed, move to completed section
          if (ctx.nodeStateArray[courseCode] === COMPLETED_STATE) {
            // Remove from remaining
            if (this.parentNode) this.parentNode.removeChild(this);

            // Create completed item
            var completedItem = document.createElement("button");
            completedItem.type = "button";
            completedItem.className = "completed-item";
            completedItem.setAttribute("data-course", courseCode);
            completedItem.textContent = courseCode;

            // Add undo handler
            completedItem.addEventListener("click", function (ev) {
              ev.preventDefault();
              var context = window.currentCDG;
              if (!context) return;
              var cCode = this.getAttribute("data-course");

              $.changeNodeState(
                context.courseArray,
                context.outgoingEdgeGraphArray,
                context.nodeStateArray,
                cCode
              );

              // If no longer completed, move back to remaining
              if (context.nodeStateArray[cCode] !== COMPLETED_STATE) {
                // Remove from completed
                if (this.parentNode) this.parentNode.removeChild(this);

                // Recreate in remaining
                var dName =
                  context.courseArray[cCode] && context.courseArray[cCode].Name
                    ? context.courseArray[cCode].Name
                    : "";

                var pText = "";
                var pr = context.courseArray[cCode].Prerequisite;
                if (pr && pr.length > 0) {
                  for (var k = 0; k < pr.length; k++) {
                    if (k > 0) pText += " • ";
                    if (pr[k] instanceof Array) {
                      pText += "(" + pr[k].join(" or ") + ")";
                    } else {
                      pText += pr[k];
                    }
                  }
                }

                // Find correct insertion position
                var allCodes = Object.keys(context.courseArray);
                var targetIndex = allCodes.indexOf(cCode);
                var existingCards = document
                  .getElementById("courseButtons")
                  .querySelectorAll("[data-course]");
                var inserted = false;

                var newCard = makeRemainingCardForFullGraph(
                  cCode,
                  dName,
                  pText
                );

                if (targetIndex >= 0) {
                  for (var m = 0; m < existingCards.length; m++) {
                    var existingCode =
                      existingCards[m].getAttribute("data-course");
                    var existingIndex = allCodes.indexOf(existingCode);
                    if (existingIndex > targetIndex) {
                      document
                        .getElementById("courseButtons")
                        .insertBefore(newCard, existingCards[m]);
                      inserted = true;
                      break;
                    }
                  }
                }

                if (!inserted) {
                  document.getElementById("courseButtons").appendChild(newCard);
                }

                // Sync UI
                if (typeof $.syncRemainingCardsUI === "function") {
                  $.syncRemainingCardsUI(
                    context.courseArray,
                    context.nodeStateArray
                  );
                }
              }
            });

            var compList = document.getElementById("completedList");
            if (compList) compList.appendChild(completedItem);

            setCourseClass(courseCode, "completedState");

            // Sync remaining cards
            if (typeof $.syncRemainingCardsUI === "function") {
              $.syncRemainingCardsUI(ctx.courseArray, ctx.nodeStateArray);
            }
          }
        });

        return button;
      }

      // Create completed items for all courses
      for (var j = 0; j < courseCodes.length; j++) {
        var code = courseCodes[j];

        // Mark as completed in state
        nodeStateArray[code] = COMPLETED_STATE;

        // Update particle system node color
        if (particleSystem.getNode(code)) {
          particleSystem.getNode(code).data.color = COMPLETED_STATE_COLOR;
        }

        // Create completed pill button
        var ctx = window.currentCDG;
        if (ctx) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "completed-item";
          button.setAttribute("data-course", code);
          button.textContent = code;

          // Add click handler to undo
          button.addEventListener(
            "click",
            (function (courseCode) {
              return function (e) {
                e.preventDefault();
                var context = window.currentCDG;
                if (!context) return;
                $.changeNodeState(
                  context.courseArray,
                  context.outgoingEdgeGraphArray,
                  context.nodeStateArray,
                  courseCode
                );

                // If no longer completed, move back to remaining
                if (context.nodeStateArray[courseCode] !== COMPLETED_STATE) {
                  // Remove from completed
                  if (this.parentNode) this.parentNode.removeChild(this);

                  // Recreate in remaining section
                  var displayName =
                    context.courseArray[courseCode] &&
                    context.courseArray[courseCode].Name
                      ? context.courseArray[courseCode].Name
                      : "";

                  var prereqText = "";
                  var preq = context.courseArray[courseCode].Prerequisite;
                  if (preq && preq.length > 0) {
                    for (var k = 0; k < preq.length; k++) {
                      if (k > 0) prereqText += " • ";
                      if (preq[k] instanceof Array) {
                        prereqText += "(" + preq[k].join(" or ") + ")";
                      } else {
                        prereqText += preq[k];
                      }
                    }
                  }

                  // Find correct insertion position
                  var allCodes = Object.keys(context.courseArray);
                  var targetIndex = allCodes.indexOf(courseCode);
                  var existingCards = document
                    .getElementById("courseButtons")
                    .querySelectorAll("[data-course]");
                  var inserted = false;

                  var newCard = makeRemainingCardForFullGraph(
                    courseCode,
                    displayName,
                    prereqText
                  );

                  if (targetIndex >= 0) {
                    for (var m = 0; m < existingCards.length; m++) {
                      var existingCode =
                        existingCards[m].getAttribute("data-course");
                      var existingIndex = allCodes.indexOf(existingCode);
                      if (existingIndex > targetIndex) {
                        document
                          .getElementById("courseButtons")
                          .insertBefore(newCard, existingCards[m]);
                        inserted = true;
                        break;
                      }
                    }
                  }

                  if (!inserted) {
                    document
                      .getElementById("courseButtons")
                      .appendChild(newCard);
                  }

                  // Sync UI
                  if (typeof $.syncRemainingCardsUI === "function") {
                    $.syncRemainingCardsUI(
                      context.courseArray,
                      context.nodeStateArray
                    );
                  }
                }
              };
            })(code)
          );

          completedList.appendChild(button);
        }

        // Update hidden input class
        setCourseClass(code, "completedState");
      }
    }
  };
})(jQuery);

/*
 * Create all the nodes for the Course Dependency Graph.
 * Each node start off as a singleton.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 */
(function ($) {
  $.createAllNodesForDependencyGraph = function (courseArray) {
    //Iterate array to create nodes in Particle System
    for (var key in courseArray) {
      var nodeId = key; //String Identifier of Node; Course code is used as the key
      var color = UNAVALIABLE_STATE_COLOR;
      var doesCourseHavePrereq =
        typeof courseArray[key].Prerequisite === "undefined" ? false : true; //determine if this course has prerequisites

      if (!doesCourseHavePrereq) {
        color = READY_STATE_COLOR;
      }

      var nodeData = {
        mass: 1,
        label: nodeId,
        color: color,
        shape: NODE_SHAPE,
      }; //node data(key-value pair)
      particleSystem.addNode(nodeId, nodeData); //add a node to the Particle System
    }
  };
})(jQuery);

/*
 * Add dependency edges for the entire Graph.
 * This goes through each node and adds the node's outgoing edges.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 */
(function ($) {
  $.addDependencyEdges = function (courseArray) {
    //Iterate array to create dependency edges
    for (var key in courseArray) {
      var currentNodeId = key; //String Identifier of target node
      var currentCourseObject = courseArray[currentNodeId]; //Get Course Object
      var currentCoursePreq = currentCourseObject.Prerequisite; //Get the prerequisites of current course

      if (!(typeof currentCoursePreq === "undefined")) {
        //Iterate dependency courses
        for (var i = 0; i < currentCoursePreq.length; i++) {
          var dependencyNodeId = currentCoursePreq[i]; //String Identifier of source node

          if (!(dependencyNodeId instanceof Array)) {
            //Add black directed edge (required course) from dependency node to current node
            particleSystem.addEdge(dependencyNodeId, currentNodeId, {
              length: 7,
              directed: true,
              color: LOGICAL_AND_EDGE_COLOR,
            }); //addEdge(sourceNode,targetNode,edgeData)
          } else {
            //Iterate dependency courses logical OR
            for (var j = 0; j < dependencyNodeId.length; j++) {
              var dependencyNodeIdOR = dependencyNodeId[j]; //String Identifier of source node

              //Add LOGICAL_OR_EDGE_COLOR directed edge from dependency node to current node
              particleSystem.addEdge(dependencyNodeIdOR, currentNodeId, {
                length: 7,
                directed: true,
                color: LOGICAL_OR_EDGE_COLOR,
              }); //addEdge(sourceNode,targetNode,edgeData)
            }
          }
        }
      }
    }
  };
})(jQuery);

/*
 * Determine all the outgoing edges for each node. Bascially mapping is determined by prerequisites to courseCode relation.
 * This will populate the outgoingEdgeGraphArray.
 * JSON Format: {NodeId1: outgoingEdgeArray1[], NodeId2: outgoingEdgeArray2[]}
 * E.g. {CS111: outgoingEdgeArray["CS112", "CS205"]}
 *
 * Sample inspected entry = "CS112" : {"Name": "Data Structures", "Prerequisite" : ["MAT151","CS111"]}
 * From just inspecting this entry, the code will result in the following:
 * MAT151: outgoingEdgeArray["CS112"]
 * CS111: outgoingEdgeArray["CS112"]
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      outgoingEdgeGraphArray - JSON object to store each node's outgoing edges. Does not distinguish edge type.
 */
(function ($) {
  $.determineAllOutgoingEdges = function (courseArray, outgoingEdgeGraphArray) {
    //iterate all the courses
    for (var courseCode in courseArray) {
      var courseObj = courseArray[courseCode];
      var coursePrereq = courseObj.Prerequisite;

      //Check if field property exist
      if (!(typeof coursePrereq === "undefined")) {
        //iterate all of a course prerequisites
        for (var i = 0; i < coursePrereq.length; i++) {
          var prereq = coursePrereq[i]; // May be a string or a list

          //Check if value is an instance of an array
          if (prereq instanceof Array) {
            //iterate all prereq with conditional OR
            for (var j = 0; j < prereq.length; j++) {
              // Inspecting if an array has been created
              if (!(outgoingEdgeGraphArray[prereq[j]] instanceof Array)) {
                outgoingEdgeGraphArray[prereq[j]] = new Array(); //create new array property
              }

              outgoingEdgeGraphArray[prereq[j]].push(courseCode); //add element to array
            }
          }

          // Single String
          else {
            // Inspecting if an array has been created
            if (!(outgoingEdgeGraphArray[prereq] instanceof Array)) {
              outgoingEdgeGraphArray[prereq] = new Array(); //create new array property
            }

            outgoingEdgeGraphArray[prereq].push(courseCode);
          }
        }
      }
    }
  };
})(jQuery);

/*
 * Changes the state of a node.
 *   UNAVALIABLE_STATE = course cannot be taken
 *   COMPLETED_STATE = completed course
 *   READY_STATE = course avaliable to take
 *
 * Possible Actions:
 * UNAVALIABLE_STATE Node -> READY_STATE Node (Result of Add Op)
 * READY_STATE -> UNAVALIABLE_STATE Node (Result of Remove-Update Op)
 * COMPLETED_STATE -> READY_STATE Node (Remove-Update Op)
 * UNAVALIABLE_STATE ->  COMPLETED_STATE Node (Not supported)
 * READY_STATE Node ->  COMPLETED_STATE Node (*Add Op)
 * COMPLETED_STATE Node -> UNAVALIABLE_STATE Node (*Remove Op)
 * *Controlled by user
 *
 * For a node to change to completed state,
 * the following conditions must be fulfilled:
 * -course must "seen" in graph
 * -course must be in ready state
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      outgoingEdgeGraphArray - JSON object to containing each node's outgoing edges
 *      nodeStateArray - keeps track of the state of each node in current graph
 *      nodeId - String Identifier of the node in particle system to change
 */
(function ($) {
  $.changeNodeState = function (
    courseArray,
    outgoingEdgeGraphArray,
    nodeStateArray,
    nodeId
  ) {
    var stateVar = nodeStateArray[nodeId];
    var nodeState = typeof stateVar === "undefined" ? -1 : stateVar;
    var canNodeSwitchFromCompletedToReady = $.canNodeSwitchFromCompletedToReady(
      courseArray,
      outgoingEdgeGraphArray,
      nodeStateArray,
      nodeId
    );

    // Node changes from completed state -> ready state
    if (nodeState == COMPLETED_STATE && canNodeSwitchFromCompletedToReady) {
      nodeStateArray[nodeId] = READY_STATE;
      setCourseClass(nodeId, "readyState");
      if (particleSystem.getNode(nodeId))
        particleSystem.getNode(nodeId).data.color = READY_STATE_COLOR;
      $.recalculateParticleSystem(
        courseArray,
        outgoingEdgeGraphArray,
        nodeStateArray,
        nodeId
      );
    }
    // Node is added to the system if it is in ready state
    else if (nodeState == READY_STATE) {
      setCourseClass(nodeId, "activeState");
      $.addNode(nodeId, COMPLETED_STATE_COLOR);
      nodeStateArray[nodeId] = COMPLETED_STATE;
      $.createNodeOutgoingEdges(
        courseArray,
        outgoingEdgeGraphArray,
        nodeStateArray,
        nodeId
      );
    }
  };
})(jQuery);

/*
 * Recalculate the current Particle System.
 * Node may be removed and a node's state may change.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      outgoingEdgeGraphArray - JSON object to containing each node's outgoing edges
 *      nodeStateArray - keeps track of the state of each node in current graph
 *      nodeId - String Identifier of the node in particle system that has changed
 */
(function ($) {
  $.recalculateParticleSystem = function (
    courseArray,
    outgoingEdgeGraphArray,
    nodeStateArray,
    nodeId
  ) {
    //Case 1: Parent Leaf Node = do nothing
    //Case 2: Parent Node with outgoing edges -> inspect child node
    if ($.hasOutgoingEdges(outgoingEdgeGraphArray, nodeId)) {
      var childNodes = outgoingEdgeGraphArray[nodeId];
      $.removeNodeOutgoingEdges(nodeId); //remove the parent node outgoing edges

      for (var i = 0; i < childNodes.length; i++) {
        var child = childNodes[i];
        var childCurrentState = nodeStateArray[child];

        //Completed Node or Unseen node -> do nothing
        if (
          typeof childCurrentState === "undefined" ||
          childCurrentState == COMPLETED_STATE
        )
          continue;
        //Yellow node -> may need to change inactive state or be removed if isolated
        else if (
          childCurrentState == READY_STATE ||
          childCurrentState == UNAVALIABLE_STATE
        ) {
          //Isolated inactive-ready node should be removed
          if ($.isNodeIsolated(child)) {
            delete nodeStateArray[child]; //delete node state
            $.removeNodeFromSystem(child); //remove node from particle system
            $("#" + child).attr("class", "inactiveState"); //put the course input button to inactive state
          }

          //Re-evaluate child node state
          else {
            var stateNum = $.determineNodeState(
              courseArray,
              nodeStateArray,
              child
            );
            if (stateNum != null) {
              var color = numToColorMapping[stateNum];
              particleSystem.getNode(child).data.color = color;
              nodeStateArray[child] = stateNum; //update to new state

              //Change color of the corresponding input button
              if (stateNum == READY_STATE) setCourseClass(child, "readyState");
              else if (stateNum == UNAVALIABLE_STATE)
                setCourseClass(child, "inactiveState");
            }
          }
        }
      }
    }
  };
})(jQuery);

/*
 * Add the node to the Particle System.
 *
 * @param -
 *      nodeId - String Identifier of the new node
 *      nodeColor - state of the new node
 */
(function ($) {
  $.addNode = function (nodeId, nodeColor) {
    var nodeData = {
      mass: 1,
      label: nodeId,
      color: nodeColor,
      shape: NODE_SHAPE,
    }; //node data(key-value pair)
    particleSystem.addNode(nodeId, nodeData); //add a node to the Particle System
  };
})(jQuery);

/*
 * Removes the node from the particle system.
 *
 * @param
 *      nodeId - String Identifier of node to be removed
 */
(function ($) {
  $.removeNodeFromSystem = function (nodeId) {
    particleSystem.pruneNode(nodeId); //remove node
  };
})(jQuery);

/*
 * Create a given node's outgoing edges in the particle system.
 * These new edges may allow unseen nodes to become
 * avaiable on the graph; new nodes may be created in the process.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      outgoingEdgeGraphArray - JSON object to containing each node's outgoing edges
 *      nodeStateArray - keeps track of the state of each node in current graph
 *      nodeId - Node String Identifier (Course code) to add outgoing edges
 */
(function ($) {
  $.createNodeOutgoingEdges = function (
    courseArray,
    outgoingEdgeGraphArray,
    nodeStateArray,
    nodeId
  ) {
    var curNodeOutgoingEdges = outgoingEdgeGraphArray[nodeId]; //an array containing node's outgoing edges
    //console.log(curNodeOutgoingEdges);

    if (!(typeof curNodeOutgoingEdges === "undefined")) {
      for (var i = 0; i < curNodeOutgoingEdges.length; i++) {
        var seenNodeId = curNodeOutgoingEdges[i];
        var edgeColor = $.determineEdgeColor(courseArray, nodeId, seenNodeId);
        var edgeData = { length: 7, directed: true, color: edgeColor };
        var stateNum = null; //determine the state of the newly added Node
        var color = null; //get the corresponding color of state number

        //check if seen node exist in the Particle System
        if (!$.doesNodeExist(seenNodeId)) {
          stateNum = $.determineNodeState(
            courseArray,
            nodeStateArray,
            seenNodeId
          ); //determine the state of the newly added Node
          color = numToColorMapping[stateNum]; //get the corresponding color of state number
          nodeStateArray[seenNodeId] = stateNum; //mark state of seen node
          $.addNode(seenNodeId, color); //add seen node to graph
          //console.log(nodeStateArray);

          // Change color of the corresponding input button
          if (stateNum == READY_STATE) setCourseClass(seenNodeId, "readyState");
        }

        //case: node is already seen, but new edges are being added which may change the state of exiting target nodes
        else {
          stateNum = $.determineNodeState(
            courseArray,
            nodeStateArray,
            seenNodeId
          );
          if (stateNum != null) {
            color = numToColorMapping[stateNum];
            particleSystem.getNode(seenNodeId).data.color = color;
            nodeStateArray[seenNodeId] = stateNum; //update to new state
            //console.log(nodeStateArray);

            if (stateNum == READY_STATE)
              setCourseClass(seenNodeId, "readyState");
          }
        }

        particleSystem.addEdge(nodeId, seenNodeId, edgeData); //attach directed edge from given node to new node that is seen
      }
    }
  };
})(jQuery);

/*
 * Removes a given node outgoing edges.
 * @param -
 *      nodeId - Node String Identifier (Course code) to remove outgoing edges
 */
(function ($) {
  $.removeNodeOutgoingEdges = function (nodeId) {
    var nodeOutgoingEdges = particleSystem.getEdgesFrom(nodeId); //Returns an array containing all Edge objects in which the node is the source. If no connections exist, returns [].

    for (var i = 0; i < nodeOutgoingEdges.length; i++) {
      particleSystem.pruneEdge(nodeOutgoingEdges[i]); //Removes the corresponding Edge from the particle system.
    }
  };
})(jQuery);

/*
 * Determines the color of an edge. Only two edge types exist for this Graph:
 * Logical AND
 * Logical OR
 * This method assumes that source node is a prequisite course to the target Node.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      srcNodeId -  its outgoing edge color is to be determined.
 *      targetNodeId - edge is directed [pointing] to the target node
 *
 * @return - color of the edge
 */
(function ($) {
  $.determineEdgeColor = function (courseArray, srcNodeId, targetNodeId) {
    var targetNodePreq = courseArray[targetNodeId].Prerequisite;

    //iterate the target node's prequisites
    for (var i = 0; i < targetNodePreq.length; i++) {
      //targetNodePreq[i] can be an element or an array object
      if (targetNodePreq[i] == srcNodeId) return LOGICAL_AND_EDGE_COLOR;
    }

    //based on the assumptions that the target node and the source node has
    //a relationship, it not necessary to iterate through the nested prequisites
    return LOGICAL_OR_EDGE_COLOR;
  };
})(jQuery);

/*
 * Determines the state of a node after a change has been made on the graph.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      nodeStateArray - keeps track of the state of each node in current graph
 *      nodeId - String Identifier of a node that is being inspected
 *
 * @return - the state of the node to be changed to
 */
(function ($) {
  $.determineNodeState = function (courseArray, nodeStateArray, nodeId) {
    var currentNodeState = nodeStateArray[nodeId];
    //console.log("determineNodeState: " + nodeId + " = "  + currentNodeState);

    //Case 1: Course is not in current graph or course cannot be taken yet
    if (
      typeof currentNodeState === "undefined" ||
      currentNodeState == UNAVALIABLE_STATE ||
      currentNodeState == READY_STATE
    ) {
      //current node must be READY_STATEif prerequisites has been fulfilled
      if ($.isCourseReadyToBeTaken(courseArray, nodeStateArray, nodeId))
        return READY_STATE;
      //current node must in UNAVALIABLE_STATE
      else return UNAVALIABLE_STATE;
    }

    //console.log("DetermineNodeState() returned NULL");
    return null;
  };
})(jQuery);

/*
 * Determines if a course is ready to be taken.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      nodeStateArray - keeps track of the state of each node in current graph
 *      nodeId - String Identitfer of node being inspected
 *
 * @return - true if node is in ready state; false otherwise
 */
(function ($) {
  $.isCourseReadyToBeTaken = function (courseArray, nodeStateArray, nodeId) {
    var courseObj = courseArray[nodeId];
    var coursePrerequisites = courseObj.Prerequisite;

    //check if prequisites have been fulfilled
    if (!(typeof coursePrerequisites === "undefined")) {
      for (var i = 0; i < coursePrerequisites.length; i++) {
        var inspectCourseIdOrCourseGroup = coursePrerequisites[i];

        //Check if handling a group of courses
        if (inspectCourseIdOrCourseGroup instanceof Array) {
          //This handles the case if given a set of courses
          //only one course from this group needs to be fufilled.
          var isGroupfulfilled = false;

          for (var j = 0; j < inspectCourseIdOrCourseGroup.length; j++) {
            var courseGroupElementId = inspectCourseIdOrCourseGroup[j];
            var prereqGRPState = nodeStateArray[courseGroupElementId];

            //check if the prerequiste course from group is completed
            if (!(prereqGRPState === "undefined") && prereqGRPState == 1) {
              isGroupfulfilled = true;
              break;
            }
          }

          //Course cannot be taken because group course prerequiste is not completed
          if (!isGroupfulfilled) return false;
        }

        //single course to inspect
        else {
          var prereqState = nodeStateArray[inspectCourseIdOrCourseGroup]; //get state of the prerequiste course

          //check if the prerequiste course is completed
          if (!(prereqState === "undefined") && prereqState == 1) {
            isGroupfulfilled = true;
            continue;
          }

          //course prerequiste has not been fulfilled
          return false;
        }
      } //end outer for loop
    }

    return true; //case if the course has no prerequisites or course prerequistes has be fufilled
  };
})(jQuery);

/*
 * Determines whether a node exist in the Particle System.
 *
 * @param -
 *      particleSystem - This object represents the graph to built
 *      nodeId - String Identifier of node
 *
 * @return - true if node exists; false otherwise
 */
(function ($) {
  $.doesNodeExist = function (nodeId) {
    return typeof particleSystem.getNode(nodeId) === "undefined" ? false : true;
  };
})(jQuery);

/*
 * Determines whether a node is a root node.
 * Courses with no prequisites are defined as root node.
 *
 * @param
 *      courseArray - contains information of all courses in major
 *      nodeId - course code of node to check
 *
 * @return - true if node is a root; false otherwise
 */
(function ($) {
  $.isRootNode = function (courseArray, nodeId) {
    return typeof courseArray[nodeId].Prerequisite === "undefined"
      ? true
      : false;
  };
})(jQuery);

/*
 * Determines whether a node has outgoing edge.
 * This also determines if a node is a leaf node. (node that has no children)
 * @param
 *      outgoingEdgeGraphArray - JSON object to containing each node's outgoing edges
 *      nodeId - course code of node to check
 *
 * @return - true if node has outgoing edges root; false otherwise
 */
(function ($) {
  $.hasOutgoingEdges = function (outgoingEdgeGraphArray, nodeId) {
    return typeof outgoingEdgeGraphArray[nodeId] === "undefined" ? false : true;
  };
})(jQuery);

/*
 * Determine if a node is isolated.
 * No outgoing or incoming edges.
 * @param -
 *      nodeId - String Identifier of node to check
 *
 * @return - true if node is isolated; false otherwise
 */
(function ($) {
  $.isNodeIsolated = function (nodeId) {
    return (
      particleSystem.getEdgesFrom(nodeId).length == 0 &&
      particleSystem.getEdgesTo(nodeId).length == 0
    );
  };
})(jQuery);

/*
 * Determines if a node can be switched from completed to ready
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      outgoingEdgeGraphArray - JSON object to containing each node's outgoing edges
 *      nodeStateArray - keeps track of the state of each node in current graph
 *      nodeId - node to inspect
 */
(function ($) {
  $.canNodeSwitchFromCompletedToReady = function (
    courseArray,
    outgoingEdgeGraphArray,
    nodeStateArray,
    nodeId
  ) {
    var childNodes = outgoingEdgeGraphArray[nodeId];

    if (!(typeof childNodes === "undefined")) {
      for (var i = 0; i < childNodes.length; i++) {
        var childNode = childNodes[i];
        var childNodeState = nodeStateArray[childNode];
        var childNodePrereq = courseArray[childNode].Prerequisite;
        var childNodeCompletedWithoutParent = false; //determine if child is completed even if the parent node is removed

        if (!(typeof childNodePrereq === "undefined")) {
          for (var j = 0; j < childNodePrereq.length; j++) {
            var elementOrList = childNodePrereq[j];

            if (elementOrList instanceof Array) {
              for (var k = 0; k < elementOrList.length; k++) {
                var ele = elementOrList[k];

                //skip node that is tested to be removed
                if (ele == nodeId) continue;
                else if (nodeStateArray[ele] == COMPLETED_STATE)
                  childNodeCompletedWithoutParent = true;
              }
            }
          }
        }

        if (
          childNodeState == COMPLETED_STATE &&
          !childNodeCompletedWithoutParent
        )
          return false;
      }
    }

    return true;
  };
})(jQuery);

/*
 * Prints the current state of each node
 *
 * @param -
 *      nodeStateArray - keeps track of the state of each node in current graph
 */
(function ($) {
  $.printAllNodeState = function (nodeStateArray) {
    for (var key in nodeStateArray) {
      console.log(key + " => " + nodeStateArray[key]);
    }
  };
})(jQuery);

/*
 * Prints all outgoing edges.
 *
 * @param -
 *       courseArray - JSON containing data of the whole system (courses of a single academic major)
 *       outgoingEdgeGraphArray - JSON object to containing each node's outgoing edges
 */
(function ($) {
  $.printAllOutgoingEdges = function (courseArray, outgoingEdgeGraphArray) {
    console.log(outgoingEdgeGraphArray); //ctl + shift + j (Chrome Browser)
    for (var courseCode in courseArray) {
      var outgoingEdges = outgoingEdgeGraphArray[courseCode];

      if (!(typeof outgoingEdges === "undefined")) {
        for (var i = 0; i < outgoingEdges.length; i++) {
          console.log(courseCode + " -> " + outgoingEdges[i]);
        }
      }
    }
  };
})(jQuery);

/*
 * Remove dependency edges for the entire Graph.
 *
 * @param
 *       courseArray - JSON containing data of the whole system (courses of a single academic major)
 */
(function ($) {
  $.removeDependencyEdges = function (courseArray) {
    //Iterate array
    for (var key in courseArray) {
      var currentNodeId = key; //String Identifier of current node
      var currentNodeSourceEdgeArray =
        particleSystem.getEdgesFrom(currentNodeId); //Get edges in which the node is the source

      //Iterate the source edges from current node and remove
      for (var i = 0; i < currentNodeSourceEdgeArray.length; i++) {
        var edgeObj = currentNodeSourceEdgeArray[i];
        particleSystem.pruneEdge(edgeObj); //Removes edge from particle system
      }
    }
  };
})(jQuery);

/*
 * Clear the course buttons.
 */
(function ($) {
  $.clearCourseButtons = function () {
    var parentNode = document.getElementById("courses");
    while (parentNode.firstChild) {
      parentNode.removeChild(parentNode.firstChild);
    }

    //add <div id="courseButtons"></div> to parent node
    var buttonsDiv = document.createElement("div");
    buttonsDiv.setAttribute("id", "courseButtons");
    parentNode.appendChild(buttonsDiv);
  };
})(jQuery);

/* Side panel open/close handling — hide header button when open, show close inside panel */
(function () {
  // small resilient resize routine (used after panel animation)
  function _resizeCanvas() {
    var canvas = document.getElementById("viewport");
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    particleSystem.screenSize(canvas.width, canvas.height);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var panel = document.getElementById("sidePanel");
    var openBtn = document.getElementById("sidePanelToggle");
    var closeBtn = document.getElementById("sidePanelClose");

    if (!panel) return;

    function setPanelOpen(open) {
      if (open) {
        panel.classList.add("visible");
        document.body.classList.add("panel-open");
        panel.setAttribute("aria-hidden", "false");
      } else {
        panel.classList.remove("visible");
        document.body.classList.remove("panel-open");
        panel.setAttribute("aria-hidden", "true");
      }
      // sync after CSS transition
      setTimeout(_resizeCanvas, 360);
    }

    // initialize closed
    setPanelOpen(false);

    if (openBtn) {
      openBtn.addEventListener("click", function (e) {
        e.preventDefault();
        setPanelOpen(true);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        setPanelOpen(false);
      });
    }

    // close on Escape
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") setPanelOpen(false);
    });

    window.addEventListener("resize", _resizeCanvas);
    // initial canvas sizing
    _resizeCanvas();
  });
})();

// helper: sync course UI class for both legacy hidden input and new card element
function setCourseClass(courseId, className) {
  // legacy hidden input (if exists)
  var input = document.getElementById(courseId);
  if (input) input.className = className;

  // new card element
  var card = document.querySelector('[data-course="' + courseId + '"]');
  if (card) {
    // normalize classes used in the app
    card.classList.remove(
      "inactiveState",
      "readyState",
      "activeState",
      "completedState"
    );
    // map to card classes: treat 'activeState' & 'completedState' similarly for styling
    if (className === "activeState" || className === "completedState")
      card.classList.add("completedState");
    else card.classList.add(className);

    // ensure disabled/aria-disabled reflect inactive vs ready
    var isInactive = className === "inactiveState";
    // If card is a button element set the disabled property; otherwise fall back to pointer-events
    if (typeof card.disabled !== "undefined") {
      card.disabled = isInactive;
    }
    card.setAttribute("aria-disabled", isInactive ? "true" : "false");
  }
}

// Re-evaluate remaining course readiness and update UI (DOM-first).
(function ($) {
  // local readiness checker (handles string and OR-array prereqs)
  function isCourseReadyLocal(courseArray, nodeStateArray, code) {
    var course = courseArray[code];
    if (!course) return false;
    var prereq = course.Prerequisite;

    // IMPORTANT: if no prereqs, always ready (root courses)
    if (!prereq || prereq.length === 0) return true;

    for (var i = 0; i < prereq.length; i++) {
      var req = prereq[i];
      if (Array.isArray(req)) {
        var anyDone = false;
        for (var j = 0; j < req.length; j++) {
          var cid = req[j];
          if (nodeStateArray[cid] === COMPLETED_STATE) {
            anyDone = true;
            break;
          }
        }
        if (!anyDone) return false;
      } else {
        if (nodeStateArray[req] !== COMPLETED_STATE) return false;
      }
    }
    return true;
  }

  // Sync all remaining course buttons in the DOM (#courseButtons) to ready/inactive
  $.syncRemainingCardsUI = function (courseArray, nodeStateArray) {
    var container = document.getElementById("courseButtons");
    if (!container) return;

    var cards = container.querySelectorAll("[data-course]");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var code = card.getAttribute("data-course");
      if (!code) continue;

      // determine readiness
      var ready = isCourseReadyLocal(courseArray, nodeStateArray, code);

      if (ready) {
        // mark ready
        nodeStateArray[code] = READY_STATE;
        setCourseClass(code, "readyState"); // use setCourseClass to update both class and disabled
      } else {
        // mark unavailable
        nodeStateArray[code] = UNAVALIABLE_STATE;
        setCourseClass(code, "inactiveState"); // use setCourseClass to update both class and disabled
      }

      // also update particleSystem node color if present
      if (
        typeof particleSystem !== "undefined" &&
        particleSystem.getNode &&
        particleSystem.getNode(code)
      ) {
        var n = particleSystem.getNode(code);
        n.data.color =
          nodeStateArray[code] === READY_STATE
            ? READY_STATE_COLOR
            : UNAVALIABLE_STATE_COLOR;
      }
    }
  };

  // Backwards-compatible function that updates states for all courses (keeps model & UI consistent)
  $.updateRemainingCourseStates = function (courseArray, nodeStateArray) {
    if (!courseArray) return;
    // first sync the DOM remaining cards (primary)
    $.syncRemainingCardsUI(courseArray, nodeStateArray);
    // then ensure any non-present courses (not in #courseButtons) have model states set
    for (var courseCode in courseArray) {
      if (!courseArray.hasOwnProperty(courseCode)) continue;
      if (nodeStateArray[courseCode] === COMPLETED_STATE) continue;
      // if course not present in remaining DOM, still compute and update model/color
      var present = document.querySelector(
        '#courseButtons [data-course="' + courseCode + '"]'
      );
      if (present) continue;
      var ready = isCourseReadyLocal(courseArray, nodeStateArray, courseCode);
      nodeStateArray[courseCode] = ready ? READY_STATE : UNAVALIABLE_STATE;
      if (
        typeof particleSystem !== "undefined" &&
        particleSystem.getNode &&
        particleSystem.getNode(courseCode)
      ) {
        particleSystem.getNode(courseCode).data.color = ready
          ? READY_STATE_COLOR
          : UNAVALIABLE_STATE_COLOR;
      }
    }
  };
})(jQuery);
