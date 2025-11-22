// Characteristics of Node and Edges
var LOGICAL_AND_EDGE_COLOR = "black";
var LOGICAL_OR_EDGE_COLOR = "orange";
var NODE_SHAPE = "dot";

// Possible states of a node
var UNAVALIABLE_STATE = 0; // Grey Node or Non-Existent Node
var COMPLETED_STATE = 1; // Green Node
var READY_STATE = 2; // Blue Node
var UNAVALIABLE_STATE_COLOR = "grey";
var COMPLETED_STATE_COLOR = "green";
var READY_STATE_COLOR = "blue";

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

// Image source
var UNDO_BUTTON_SRC = "svg/undo.svg";

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
    particleSystem.renderer = Renderer("#viewport"); // Initializes and redraws Particle system

    // Data on the completed Course Dependency Graph and the course dependency graph that is being built.
    // Associative Array <Key>:<Value> [Course Code : Course Data]
    // E.g "CS431" : {"Name": "Software Engineering", "Prerequisite" : ["CS112",["CS314","CS336","CS352","CS416"]]}
    // Incoming edges are provided. These are the prerequisites
    var courseArray; // stores the json data from file of the completed course dependency graph
    var outgoingEdgeGraphArray = {}; // {} = new Object(); contain the outgoing edges of each node of the completed graph
    var nodeStateArray = {}; // keeps track of the current state of each node in the graph that is being built

    $.ajax({
      url: jsonFile, // url: path to json file
      async: false, // async: function gets called in sequence with code, so var courseArray is populated
      dataType: "json", // json data
      success: function (json) {
        courseArray = json;
      }, //sets courseArray with json data
    });

    $.determineAllOutgoingEdges(courseArray, outgoingEdgeGraphArray); //populates the outgoingEdgeGraphArray
    //console.log(outgoingEdgeGraphArray);

    //Trigger Event buttons
    document.getElementById("displayEntireDependencyGraph").onclick =
      function () {
        $.createEntireCourseDependencyGraph(courseArray, nodeStateArray);
      };
    document.getElementById("clearGraph").onclick = function () {
      $.clearEntireGraph(courseArray, nodeStateArray);
    };

    var labelTag = document.createElement("label"); //creates the title on the side panel
    var coursesDiv = document.getElementById("courses"); //get the div tag with id = courses
    var academicMajorName = $(
      "#academicMajor option[value='" + jsonFile + "']"
    ).text(); //get the value of the current select option
    labelTag.innerHTML = "<b>" + academicMajorName + " Courses</b><br/>"; //set the content of label tag
    coursesDiv.insertBefore(labelTag, coursesDiv.firstChild); //add title as the first child

    //Dynamically generate trigger event buttons for courses
    //E.g. document.getElementById('MAT151').onclick = function(){changeNodeState('MAT151')};
    for (courseCode in courseArray) {
      var btnShow = document.createElement("input"); //create input element
      var span = document.createElement("span"); //create span element to display course prerequisites
      var divSpan = document.createElement("div"); //container for span
      var spanUndo = document.createElement("img"); //undo indication

      divSpan.setAttribute("class", "prerequisites"); //set class for div element
      spanUndo.setAttribute("class", "hidden"); //hide undo indication picture
      spanUndo.setAttribute("src", UNDO_BUTTON_SRC); //set source of image
      spanUndo.setAttribute("id", courseCode + "Undo"); //id of undo span
      btnShow.setAttribute("class", "inactiveState"); //set inactive state for course button
      btnShow.setAttribute("type", "button"); //set attribute for input element
      btnShow.setAttribute("id", courseCode); //set id for input button
      btnShow.value = courseCode + ": " + courseArray[courseCode].Name; //set name value for element
      btnShow.onclick = (function (courseCode) {
        return function () {
          $.changeNodeState(
            courseArray,
            outgoingEdgeGraphArray,
            nodeStateArray,
            courseCode
          );
        };
      })(courseCode); //attach custom onclick function to button

      var prerequisiteObj = courseArray[courseCode].Prerequisite;
      var prerequisiteString = "";

      //Generate the Prequisite string for a course
      if (!(typeof prerequisiteObj === "undefined")) {
        prerequisiteString = " Prerequisite: ";

        // Iterate through the prerequisites
        for (var i = 0; i < prerequisiteObj.length; i++) {
          var preqAndOrObj = prerequisiteObj[i]; // The prerequisite object may be a string or a list

          //Always dealing with two or more "OR elements"
          if (preqAndOrObj instanceof Array) {
            var preqOrObjLength = preqAndOrObj.length;
            var lastOrElementIndex = preqOrObjLength - 1;

            //Case: OR group is not first element
            if (i != 0) {
              prerequisiteString = prerequisiteString + " and ";
            }

            for (var j = 0; j < preqOrObjLength; j++) {
              var preqOrElement = preqAndOrObj[j];

              //Case 1: OR first element
              if (j == 0)
                prerequisiteString = prerequisiteString + " [ " + preqOrElement;
              //Case 2: OR last element
              else if (j == lastOrElementIndex)
                prerequisiteString =
                  prerequisiteString + " or " + preqOrElement + " ]";
              //Case 3: Middle elements
              else
                prerequisiteString =
                  prerequisiteString + " or " + preqOrElement;
            }
          } else {
            //Case 1: first element
            if (i == 0)
              prerequisiteString = prerequisiteString + " " + preqAndOrObj;
            //Case 2: append "and [course code]" to prereq string
            else
              prerequisiteString = prerequisiteString + " and " + preqAndOrObj;
          }
        }
      }

      span.innerHTML = prerequisiteString;
      divSpan.appendChild(span);

      const courseButtons = document.querySelector("#courseButtons");
      const courseItemDiv = document.createElement("div"); // wrap course in div
      courseItemDiv.setAttribute("class", "course-item"); // set class for styling a course item
      courseItemDiv.appendChild(btnShow); // add button to div[id=course-item] tag
      courseItemDiv.appendChild(spanUndo); // add undo button
      courseItemDiv.appendChild(divSpan); // add prerequisites tag
      courseButtons.appendChild(courseItemDiv); // add course item to course buttons div
    }

    $.initializeGraph(courseArray, nodeStateArray); //initialize the default state of the Graph; Add courses with no dependency
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
        $("#" + courseCode).attr("class", "readyState"); //change css of input button to  ready state
      }
    }
  };
})(jQuery);

/*
 * Reset Graph (Particle System) to its default state.
 * Removes all the nodes and edges. Adds the root nodes.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      nodeStateArray - keeps track of the state of each node in current graph
 */
(function ($) {
  $.clearEntireGraph = function (courseArray, nodeStateArray) {
    //does not work since nodeStateArray is a local copy, but the properties/elements can still be modified
    //nodeStateArray = {};//initialize a new object; previous object is garbage collected

    //Clear nodeStateArray
    for (var code in nodeStateArray) {
      delete nodeStateArray[code]; //delete the element/property in object
    }

    //Iterate all courses in major
    for (var key in courseArray) {
      $("#" + key + "Undo").addClass("hidden"); //hide undo button
      var currentNodeId = key; //String Identifier of current node
      $("#" + currentNodeId).attr("class", "inactiveState"); //put the course input button to inactive state

      //determine if node exist in Particle system
      if ($.doesNodeExist(currentNodeId))
        particleSystem.pruneNode(currentNodeId); //Removes the corresponding Node from the particle system (as well as any Edges in which it is a participant).
    }

    $.initializeGraph(courseArray, nodeStateArray); //set to initial state of graph
  };
})(jQuery);

/*
 * Create the entire course dependency graph of an academic major.
 *
 * @param -
 *      courseArray - JSON containing data of the whole system (courses of a single academic major)
 *      nodeStateArray - keeps track of the state of each node in current graph
 */
(function ($) {
  $.createEntireCourseDependencyGraph = function (courseArray, nodeStateArray) {
    $.clearEntireGraph(courseArray, nodeStateArray); //clear existing particle system
    $.createAllNodesForDependencyGraph(courseArray); //create all nodes; each node start off as a singleton
    $.addDependencyEdges(courseArray); //adds the dependency edges
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
    //console.log($.printAllNodeState(nodeStateArray));
    var stateVar = nodeStateArray[nodeId];
    var nodeState = typeof stateVar === "undefined" ? -1 : stateVar;
    var canNodeSwitchFromCompletedToReady = $.canNodeSwitchFromCompletedToReady(
      courseArray,
      outgoingEdgeGraphArray,
      nodeStateArray,
      nodeId
    );

    //Node changes from completed state -> ready state
    if (nodeState == COMPLETED_STATE && canNodeSwitchFromCompletedToReady) {
      nodeStateArray[nodeId] = READY_STATE; //mark course as "Ready" state
      $("#" + nodeId).attr("class", "readyState"); //change input button to inactive state
      particleSystem.getNode(nodeId).data.color = READY_STATE_COLOR;
      $.recalculateParticleSystem(
        courseArray,
        outgoingEdgeGraphArray,
        nodeStateArray,
        nodeId
      ); //recalculate the state of each node that has a relationship with the removed node (look at the removed node's outging edges)
    }

    //Node is added to the system if it is in ready state
    else if (nodeState == READY_STATE) {
      $("#" + nodeId).attr("class", "activeState"); //change css of input button to active state
      $.addNode(nodeId, COMPLETED_STATE_COLOR); //add completed Node to Particle System
      nodeStateArray[nodeId] = COMPLETED_STATE; //mark course as taken
      $.createNodeOutgoingEdges(
        courseArray,
        outgoingEdgeGraphArray,
        nodeStateArray,
        nodeId
      ); //add a node's outgoing edges
    }

    //Recalculate to which see courses can be undo
    for (var courseCode in courseArray) {
      var hasAbilityToUndo = $.canNodeSwitchFromCompletedToReady(
        courseArray,
        outgoingEdgeGraphArray,
        nodeStateArray,
        courseCode
      );
      var state = nodeStateArray[courseCode];
      if (state == COMPLETED_STATE && hasAbilityToUndo)
        $("#" + courseCode + "Undo").removeClass("hidden"); //show undo button
      else $("#" + courseCode + "Undo").addClass("hidden"); //hide undo button
    }

    //console.log(nodeStateArray);
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
              if (stateNum == READY_STATE)
                $("#" + child).attr("class", "readyState");
              //change css of input button to  ready state
              else if (stateNum == UNAVALIABLE_STATE)
                $("#" + child).attr("class", "inactiveState"); //put the course input button to inactive state
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

          //Change color of the corresponding input button
          if (stateNum == READY_STATE)
            $("#" + seenNodeId).attr("class", "readyState"); //change css of input button to  ready state
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
              $("#" + seenNodeId).attr("class", "readyState"); //change css of input button to  ready state
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

/* Side Panel Toggle Functionality */
document.addEventListener("DOMContentLoaded", function () {
  const sidePanel = document.getElementById("sidePanel");
  const toggleBtn = document.getElementById("sidePanelToggle");

  // Ensure side panel starts hidden (no .visible class)
  sidePanel.classList.remove("visible");

  toggleBtn.addEventListener("click", function () {
    sidePanel.classList.toggle("visible");
    // Resize canvas after the panel transition
    setTimeout(resizeCanvas, 360);
  });
});

/* Canvas & Particle System Resizing */
function resizeCanvas() {
  const canvas = document.getElementById("viewport");
  if (canvas) {
    // Set canvas pixel size to match its flexed size for crisp rendering
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    // inform particle system of new size
    particleSystem.screenSize(canvas.clientWidth, canvas.clientHeight);
  }
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("DOMContentLoaded", resizeCanvas);
