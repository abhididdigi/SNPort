var jp = new JavascriptProbe("mid_server_name");
jp.addParameter("file_name","name_of_file.csv");
jp.addParameter("folder_name","folder_location");
jp.addParameter("csv_content",new JSON().encode([["Name","Class","Section"],["Abhiram","CSE","A"],["Jon Doe","CSE","B"]]));

jp.setName("PT_CSVWriter");
jp.setJavascript("var ptf = new PT_CSVWriter(); ptf. write()");
var probe_sys_id = jp.create();
