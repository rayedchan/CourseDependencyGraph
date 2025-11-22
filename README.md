# Course Dependency Graph

Demo: https://rayedchan.github.io/CourseDependencyGraph/
Course dependency graph of an academic major. This project uses ArborJS to build and display a dependency graph. Useful information can be obtained from dependency graph like course prerequisites, minimum number of semesters to complete a major (longest path), courses that are ready to be taken given completed courses, course scheduling, to name a few.

# Implementation

Data Storage: Each academic major is stored in a separate JSON file.  
Data Representation: The data within a JSON file represents a hash map. The key is a String type and course id is used as the key field since it is unique. The value of the hash map holds an object with the following properties {Name = The name of the course, Prerequisites = A list of course names to be completed before taking this course}.  
Description: The particle system starts with the courses with no prerequisites. Each course node in the system has a state as represented by a color (Grey = Unavailable, Blue = Ready to take, Green = Completed, Unknown = Not seen yet). A course can only be marked completed (Green state) if all the prerequisites are fulfilled (It is implied that the current node is ready be taken (blue state)). Once a course is completed, more course nodes may become avaliable or discovered. A course is marked ready to be taken (blue state) if all the prerequisites are completed. A course node is marked unavailable (Grey color) if the node has been seen (at least one prerequisite was completed). Inbound edges represents the course node's prerequisites. Undo of completed course node if and only if there are not outbound edges to another completed course node. Yellow edges represents "OR prerequisites".

# Bugs

-Single node in Particle System crashes code (ArborJS)  
-Does not work for IE9 (ArborJS)  
-Event trigger buttons fail to work if Particle System freezes

# My Suggestion for Improvements

-Add functionality to handle corequisite  
-Redesign algorithm and json data structure to handle complex course prerequisite

- Example Scenario: (C1 && (C2 || (C3 && C4)) || (C5 && C6)
- Example JSON Representation: OR:[[C1,OR:[C2,[C3,C4]]],[C5,C6]]

-Handle overlapping (equivalent) courses

# The MIT License (MIT)

Copyright (C) 2013 rayedchan  
ArborJS by samizdatco [https://github.com/samizdatco/arbor]

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
