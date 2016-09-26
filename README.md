# SNPort
A specialized set of MID Server Script Includes.

What?
====
A wrapper around custom JAR files resulting in set of MID Server Script Includes used to push/ read files from MID Server.

Why?
===
Though there are a lot of MID Server Script Includes available, all of them are not at one place. This repository has two goals at the time of writing.

1. Be simple and blazingly fast.
2. Be at one place. 

Dependencies:
=============
Below are the list of JAR Files you *need* for SNPort to work.

1. Apache Commons IO : You will find the Jar file [here](http://commons.apache.org/proper/commons-io/download_io.cgi)
  This is extensively used to do read and write operations at native speed.
  
2. Open CSV : Download the Jar file from [SourceForge] (https://sourceforge.net/projects/opencsv/)
  This library is used for all CSV related operations.

For tutorial on installing Jar files, here is an [Awesome Video] (https://www.youtube.com/watch?v=tOHuFVE3XNQ) from John Anderson.


List of files available
=======================

####PT_WriteClasses

All the files in this folder will contain Script Include that write from ServiceNow into the MID server.

1. PT_PostFile.js => A blazingly fast MID Server SI to move any file from ServiceNow into MID Server. If the folder that's passed is not present, creates one.
2. PT_CSVWriter.js => A blazingly fast MID Server SI to create CSV files given an array of arrays (of data)
3. Many more coming soon!  ( I'm in the process of cleaning a lot of Script Includes, that can a) Read XML and CSV files from MID Server b) Post the data into an Import set c) Apply filter to pull selected files.


Debug options
=============

1. By setting `this.debug` to true, debug messages will be sent into the `agent.log.0` file present in the `logs` folder of `agent`.
2. Debug messages are on by default.


Invocation
==========

1. Example snippetts on how to call various MID Server Script Includes are present in the Sample Invocation folder.


TODO:
====

1. Write Tests.
2. Write examples.






