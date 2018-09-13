// 1. Check the protocol.
// 2. Check the type of the file_selection_criteria.
// 3. Depending on the file selection criteria,
//      3.2 : Once we get file(s), iterate over them; and based on the transformation_type,
//      3.3 : For each file if the transformation_type == "Import and Transform", iterate over each row of the XML
//              do custom handling, translation and POST it back to the ServiceNow instance using import set Webservice.
//      3.3.1 Write a function to handle posting the data or file.
//      3.3.2 For every file also write an entry in Scheduled Job Run Log table using the API created.
//      3.3.3 If everything is fine, update the Scheduled Job Runs as Success, else failure.
//      3.4 For the transformation_type == "Tranfer file", then
//      3.4.1 use the same POST transform to post the file using the API created. Remember the API should execute the
//              script portion of the Scheduled Job when the data is sent back.
var PT_FileImporter = Class.create();

PT_FileImporter.prototype = {

    initialize: function() {

        //read all probe parameters.
        this.probeParameters = this._getProbeParameters();
        this.debugString = '';
        this.debug = true;

        // file utils.
        this.FileUtils = new Packages.org.apache.commons.io.FileUtils();

        //string utils
        this.StringUtil = Packages.com.glide.util.StringUtil;

        // csvreader.

        this.csv_reader = Packages.com.opencsv.CSVReader;

        // file reader.
        this.file_reader = Packages.java.io.FileReader;

        // entire log.
        this.log_message = [];
        this.error_log = [];

    },


    // --------------------------------------------------------------------------------------------------------------------

    /*
     MID Server handling functions.
     */

    MID_HandleFiles: function() {

        try {
            var fileListArray = this.MID_getListOfFiles();




            var transformationType = this.probeParameters.transformationType;

            //3.3
            if (transformationType == "import_and_transform") {
                //3.2.
                //3.2.1 : if the import_and_transform; parse the XML and for each row,

                for (var v = 0, len = fileListArray.length; v < len; v++) {
                    this.handleFiles(fileListArray[v]);
                }

            } else if (transformationType == "file_transfer") {
                this._log("Transformation Type" + transformationType);
                this._log("List of tiles " + fileListArray + "length = " + fileListArray.length);
                var receivedObj = JSON2.parse(this.probeParameters.args);
                var filesAttached = receivedObj["existing_file_list"] + '';

                var operation = receivedObj["operation"] + '';


                // idea :
                // 1. Get the list of files.
                // 2. Also get the files from the args given to make sure you filter those out, too.
                // 3. For the rest of files left, just make a call to API to pass the base64.
                // 4. The API is supposed to run the script in the scheduled job.

        

                //var list_of_files_from_service_now = filesAttached.split('|');
                var postResponse = [];
                this._log("tiles Attached" + filesAttached + "length of ffiles " + fileListArray.length);

                // (1) get the list of files in the given folder:
                for (var v = 0, len = fileListArray.length; v < len; v++) {
                    // (2) Get the list of all the files.

                    var file = fileListArray[v];
                    this._log("filesAttached" + filesAttached)

                    // if there are no files sent, then post _all_ the files.
                    if (JSUtil.nil(filesAttached) || filesAttached.indexOf(file.getName() + '') == -1) {
                        //only take these files.
                        this._log("iterating...")
                        //return this.postFile(file);
                        var fileResponse = this.postFile(file);
                        if (fileResponse["status"] == -1) {
                            var message = fileResponse["message"];
                            this.prepareError("log", message);
                        }
                        postResponse.push(fileResponse);
                    }
                }

                return JSON2.stringify(postResponse);
            }
        } catch (e) {
            this.error_log += "Error in the MID handle files: " + e;
        } finally {
            this._log(this.error_log.join("\n"));
            this._log(this.log_message.join("\n"));
        }
    },

    // @lifted from  : Entire code lifted from MID Server import facility and added a file to check for Regexp.

    MID_getListOfFiles: function() {

        try {
            //Get the list of files that we will actually process (depending on chosen setting this may not be all files in the directory)
            this._log("Folder location" + this.probeParameters.folder_location);
            var targetFile = new Packages.java.io.File(this.probeParameters.folder_location);
            var fileListArray;
            var jsFileFilter;
            var fileFilter;

            //First we check if mode of operation is "all files in a directory"
            if (this.probeParameters.file_selection_criteria == 'all_files') {

                jsFileFilter = {
                    accept: function(fileObject) {
                        if (fileObject.isFile()) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                };
                fileFilter = new Packages.java.io.FileFilter(jsFileFilter);
                fileFilter.accept(targetFile);

                fileListArray = targetFile.listFiles(fileFilter);
            }
            //next we check if we are looking for all files with some extension, regexp or exact file name.
            else {

                var jsFileID = this.probeParameters.file_name.toString();


                //In below segments we create a jsFileFilter object that helps us to instanciate a FilenameFilter interface
                //See: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino/Scripting_Java?redirectlocale=en-US&redirectslug=Scripting_Java

                //Here we check if mode of operation is "all files with some extension"
                if (this.probeParameters.file_selection_criteria == 'file_extension') {

                    jsFileFilter = {
                        accept: function(fileObject, fileName) {
                            var extStartIndex = fileName.length - 4;
                            if (fileName.indexOf(jsFileID, extStartIndex) > -1) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    };
                    fileFilter = new Packages.java.io.FilenameFilter(jsFileFilter);
                    fileFilter.accept(targetFile, jsFileID);

                    fileListArray = targetFile.listFiles(fileFilter);
                }
                //Here we check if mode of operation is "static filename"
                else if (this.probeParameters.file_selection_criteria == 'file_name') {

                    jsFileFilter = {
                        accept: function(fileObject, fileName) {
                            if (fileName.indexOf(jsFileID) == 0) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    };
                    fileFilter = new Packages.java.io.FilenameFilter(jsFileFilter);
                    fileFilter.accept(targetFile, jsFileID);

                    fileListArray = targetFile.listFiles(fileFilter);
                }
                //Here we check if mode of operation is "file name containing regular expression"
                else if (this.probeParameters.file_selection_criteria == "reg_exp") {
                    jsFileFilter = {
                        accept: function(fileObject, fileName) {
                            var re = new RegExp(jsFileID);
                            fileName = fileName + ''; // making sure we have the file name here.
                            if (re.test(fileName)) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    };
                    fileFilter = new Packages.java.io.FilenameFilter(jsFileFilter);
                    fileFilter.accept(targetFile, jsFileID);

                    fileListArray = targetFile.listFiles(fileFilter);
                }
                //Here we check if mode of operation is "all files with some keyword"
                else if (this.probeParameters.file_selection_criteria == 'file_name_contains') {

                    jsFileFilter = {
                        accept: function(fileObject, fileName) {
                            fileName = fileName + '';




                            if (fileName.indexOf(jsFileID) != -1) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    };
                    fileFilter = new Packages.java.io.FilenameFilter(jsFileFilter);
                    fileFilter.accept(targetFile, jsFileID);

                    fileListArray = targetFile.listFiles(fileFilter);
                }
            }

            this._log(fileListArray);
            fileListArray.sort();
            return fileListArray;
        } catch (e) {
            this._log("Error in the MID handle files. ");
            return {
                "status": "-1",
                "message": e.getMessage()
            };
        }
    },

    // ---------------------------------------------------------------------------------------------------------------------

    /*
     functions to parse a file. supports only xml for now.
     */


    //takes a files, iterates over each row and create records.
    //supports only XML for now. XML need custom handling.
    //called when transformationType == "import_and_transform"
    handleFiles: function(file) {
        //3.3.2

        var file_extension = this._getFileExtension(file.getName());
        this._log("File extension is" + file_extension);

        if (file_extension == "xml") {
            this._processXML(file)
        } else if (file_extension == "csv") {
            this._processCSV(file)
        }
    },

    /*
     functions to convert a file into base64 and post it back.
     */

    postFile: function(file) {
        // 1. open the file.
        // 2. Convert the file to base64
        // 3. post it back.

        //(1) open the file.
        //readFileToByteArray
        this._log("inside the post File function");
        var attachmentBytes = this.FileUtils.readFileToByteArray(file);

        //(2) Base64 encode.
        var base64_attach = this.StringUtil.base64Encode(attachmentBytes);

        var details = JSON2.parse(this.probeParameters.args); //Convert string to object

        var o = {};
        o["table_name"] = details["table"] + '';
        o["key"] = details["currentRecord"] + '';
        o["base64_encoded"] = base64_attach + '';
        o["integration"] = details["integration"] + '';
        o["file_name"] = file.getName() + '';
        o["file_ext"] = this.probeParameters.file_extension + '';
        o["column_name"] = details["column_name"] + '';
        o["content_type"] = this.probeParameters.content_type + '';
        o["encrypted"] = "true"
        o["operation"] = details["operation"]
        return this.callAPI(o);
    },

    prepareError: function(integration_name, message) {
        this._log("inside prepare error" + message);
        if (integration_name == "log") {
            // it just logs to the system.
            var msg = " There is an exception in the MIDServer Script Include" + message;
            this.postError({
                "message": msg,
                "integration": "MIDSERVER_related_error",
                "log_table_name": "u_log_virtual_log"
            });
        }
    },

    postError: function(obj) {
        var url = this.probeParameters.instance_url + 'port_file_error.do?action=' + obj["integration"];

        var str = JSON2.stringify(obj); //Convert object to string

        var response = this.API_wrapperMakeCallReusable("POST", str, url);
        this._log("The response returned in error" + JSON2.stringify(response));
        return response;
    },




    callAPI: function(obj) {
        var url = this.probeParameters.instance_url + 'port_document_entry.do?action=' + obj["integration"];

        var str = JSON2.stringify(obj); //Convert object to string

        var response = this.API_wrapperMakeCallReusable("POST", str, url);
        if (!JSUtil.nil(response["status"]) && response["status"] == -1) {
            this.prepareError("log", response["message"]);
        }

        this._log(response);
        return response;
    },

    //---------------------------------------------------------------------------------------------------------------------

    /*
     API Wrapper call..
     */

    //takes three parameters
    // method : the method you want to pass, it accepts get and put for now.
    // body : if it's a post, then body will be not empty
    // url : the URL to which the function is being called.

    API_wrapperMakeCallReusable: function(method, body, url) {

        try {
            var http_client = this.API_PrepareHTTPClient();
            var prepareMethod = '';

            if (method == "POST") {
                prepareMethod = this.API_prepareMethod(method, url, body)
            } else if (method == "GET") {
                prepareMethod = this.API_prepareMethod(method, url)
            }

            var response = this.API_callRestService(http_client, prepareMethod);

            return response;
        } catch (e) {
            this.error_log.push("Error in API Wrapper make call reusable. " + e)
            return {
                "status": "-1",
                "message": "Error in API_weapperMakeCallReusable. " + e
            }
        }
    },

    API_wrapperMakeCall: function(method, body, params) {

        if (JSUtil.nil(params["table_name"])) {

            return;
        }

        var table_name = params["table_name"];
        var http_client = this.API_PrepareHTTPClient();

        if (JSUtil.type_of(body) != 'string') { // check to see if the body being passed is a string. If it is NOT a string,
            // then convert it into a string.
            body = JSON2.stringify(body)
        }

        var instanceConnectionURL = this.API_getInstanceConnectionURL(method, table_name, params);
        var prepareMethod = '';
        if (method == "POST") {
            prepareMethod = this.API_prepareMethod(method, instanceConnectionURL, body);
        } else {
            prepareMethod = this.API_prepareMethod(method, instanceConnectionURL, body);
        }

        var response = this.API_callRestService(http_client, prepareMethod);

        return response;
    },

    API_PrepareHTTPClient: function() {
        //taken from  APP.
        var probeParams = this.probeParameters;
        var httpClient = new Packages.org.apache.commons.httpclient.HttpClient();
        var instanceCredentials = new Packages.org.apache.commons.httpclient.UsernamePasswordCredentials(probeParams.instanceUser, probeParams.instancePassword);
        httpClient.getState().setCredentials(new Packages.org.apache.commons.httpclient.auth.AuthScope(null, 443, null), instanceCredentials);
        return httpClient;
    },

    API_getInstanceConnectionURL: function(method, table_name, params) {

        var instanceConnectionURL = this.probeParameters.instance_url;

        if (method == 'POST' && table_name == "u_port_scheduled_run") {
            // if method == POST and the table is port scheduled run, then the URL for creating a PORT run.
            if (params["type"] == "insert") {
                instanceConnectionURL = this.probeParameters.instance_url + "port_api.do?action=scheduled_job_run_log/insert";
            } else if (params["type"] == "update") {
                instanceConnectionURL = this.probeParameters.instance_url + "port_api.do?action=scheduled_job_run_log/update";
            }
        } else if (method == "POST" && params["type"] == "import_set") {
            instanceConnectionURL = this.probeParameters.instance_url + "api/now/import/" + table_name;
        }

        // TODO: For attachments invoke the attachment script. There is no API endpoint for that, yet.

        return instanceConnectionURL;
    },

    API_prepareMethod: function(method, instanceConnectionURL, requestBody) {
        if (method == "POST") {
            var postObj = new Packages.org.apache.commons.httpclient.methods.PostMethod(instanceConnectionURL);
            postObj.addRequestHeader("Accept", "application/json");
            postObj.addRequestHeader("Content-Type", "application/json");
            postObj.setRequestEntity(new Packages.org.apache.commons.httpclient.methods.StringRequestEntity(requestBody));
            return postObj;
        } else if (method == "GET") {
            var getMethod = new Packages.org.apache.commons.httpclient.methods.GetMethod(instanceConnectionURL)
            getMethod.addRequestHeader("Accept", "application/json");
            getMethod.addRequestHeader("Content-Type", "application/json");
            return getMethod;
        }
    },

    API_callRestService: function(httpclient, method) {
        var exception = '';
        try {
            var statusCode = '' + httpclient.executeMethod(method);


            if (statusCode == Packages.org.apache.commons.httpclient.HttpStatus.SC_OK) {
                var responseBody = '' + method.getResponseBodyAsString();


                return {
                    "status": statusCode,
                    "responseBody": responseBody
                }
            } else {

                return {
                    "status": statusCode,
                    "responseBody": responseBody
                }
            }
        } catch (e) {
            exception = e;
            this.error_log.push(e);
            return {
                "status": -1,
                "responseBody": "Exception in the Rest Service Call." + e
            };
        } finally {
            method.releaseConnection(); // releasing the connection at all costs..

        }
    },


    // -----------------------------------------------------------------------------------------------------------------


    /*
     Utility functions..
     */

    _getProbeParameters: function() {

        var probe_params = {};
        probe_params.instance_url = this._getInstanceBaseURL(probe.getParameter("instance_name"));
        probe_params.instanceUser = ms.getConfigParameter("mid.instance.username");
        probe_params.instancePassword = ms.getConfigParameter("mid.instance.password");
        probe_params.config_columnMapping = probe.getParameter("config.columnMapping") + '';

        probe_params.config_sys_id = probe.getParameter("config.id");
        probe_params.config_importSetName = probe.getParameter("config.importSetName");
        probe_params.config_script = probe.getParameter("config.script");
        probe_params.regular_expression = probe.getParameter("u_regular_expression");
        probe_params.folder_location = probe.getParameter("u_folder_location");
        probe_params.file_extension = probe.getParameter("u_file_extension");
        probe_params.file_selection_criteria = probe.getParameter("u_file_selection_criteria");
        probe_params.file_name = probe.getParameter("u_file_name");
        probe_params.protocol = probe.getParameter("u_protocol");
        probe_params.transformationType = probe.getParameter("config.transformationType");
        probe_params.probe_name = probe.getParameter("u_name");
        probe_params.config_jsonMapping = probe.getParameter("config.jsonMapping");
        probe_params.scheduledJobRun = probe.getParameter("scheduled_job_run");
        probe_params.args = probe.getParameter("args1") + '';
        probe_params.content_type = this._getContentType(probe.getParameter("u_file_extension"));

        probe_params.seperator = probe.getParameter("seperator");
        var isHeader = probe.getParameter("isHeader") + '';



        if (JSUtil.nil(isHeader) || isHeader == null) {
            isHeader = false;
        }

        probe_params.isHeader = isHeader;

        return probe_params;
    },

    _getInstanceBaseURL: function(instanceParameter) {
        var instanceBase = instanceParameter + '';
        if (instanceBase.lastIndexOf('/') != instanceBase.length - 1) {
            instanceBase += "/";
        }
        return instanceBase;
    },

    _getContentType: function(fileExtension) {
        var ext = fileExtension + '';
        var type = '';

        if (ext == 'doc') {
            type = "application/msword";
        } else if (ext == 'docx') {
            type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (ext == 'pdf') {
            type = "application/pdf";
        } else {
            type = "application/octet-stream";
        }
        return type;
    },

    _log: function(message) {

        if (this.debug == false) {
            return;
        }

        ms.log("** Logging from PT_File Importer " + message);

    },

    get_log: function() {
        return this.debugString;
    },

    _calculateArchiveLocation: function(loc_name) {
        this._log("ENTERING _calculateArchiveLocation");
        var loc_array = loc_name.split("\\");
        loc_array[loc_array.length - 2] = "archive";
        this._log("RETURNING FROM _calculateArchiveLocation");
        return loc_array.join("\\");

    },

    _getFileExtension: function(name) {

        name = '' + name;
        var arr = name.split("."); // split it by the dot.
        var len = arr.length;
        return arr[len - 1];
    },

    _processXML: function(file) {
        //read file contents.

        try {
            var table_name = this.probeParameters.config_importSetName; // for processing the XML and CSV, the table is
            // ALWAYS import setName.

            var jsonMapping = this.probeParameters["config_jsonMapping"] + '';

            var columnMapping = this.probeParameters["config_columnMapping"] + '';

            var columnMappingJSON = JSON2.parse(columnMapping);

            var file_contents = this.FileUtils.readFileToString(file);
            file_contents = file_contents + '';




            var xmlhelp = new XMLHelper(file_contents);
            var obj = xmlhelp.toObject();
            //JSONMapping should point you back to an array or an object.

            if (!JSUtil.nil(jsonMapping))
                var resultingJSON = this.getPattern(obj, jsonMapping);
            else
                resultingJSON = obj;
            var configuration_params = this.getConfigurationParams("POST", table_name, "import_set");


            this._log("resulting json" + JSON2.stringify(resultingJSON));

            var type_json = JSUtil.type_of(resultingJSON);


            var is_array = JSUtil.instance_of(resultingJSON, "Array");
            if (type_json == 'object') {
                if (is_array == false) {
                    var singleObject = resultingJSON;
                    var o = {};
                    for (var key in columnMappingJSON) {
                        var value = columnMappingJSON[key];
                        o[key] = this.getPattern(singleObject, value);
                    }
                    this.API_wrapperMakeCall("POST", JSON2.stringify(o), configuration_params);

                } else if (is_array == true) {
                    for (var i = 0, len = resultingJSON.length; i < len; i++) {
                        var singleObject = resultingJSON[i];
                        var o = {};
                        for (var key in columnMappingJSON) {
                            var value = columnMappingJSON[key];
                            o[key] = this.getPattern(singleObject, value);
                        }

                        var response = this.API_wrapperMakeCall("POST", JSON2.stringify(o), configuration_params); // TODO: check to see if you need to string or an object.

                        if (response.status == "-1" || !(response.status == Packages.org.apache.commons.httpclient.HttpStatus.SC_OK || response.status == Packages.org.apache.commons.httpclient.HttpStatus.SC_CREATED)) {

                            //TODO: Have an error endpoint to log any errors to.
                            var error_message = "There is a problem in the function _ProcessXML. When the information was posted back to import set, ServiceNow returned an error."
                            this.prepareError("log", error_message);

                        }


                    }



                }


                this._archive(file);
                //everything is good at this point, so create a log run:

                var log_configuration_params = this.getConfigurationParams("POST", "u_port_scheduled_run", "insert");
                var return_message = "All records successfully transformed for " + file.getName();
                var log_response_object = {
                    "message": return_message,
                    "result": "success",
                    "u_scheduled_run": this.probeParameters.scheduledJobRun
                };
                //var log_run_response = this.API_wrapperMakeCall("POST", JSON2.stringify(log_response_object), log_configuration_params);
                //we don't really care what the log_run_response was.
                //var message = "The response we received after posting the  response is **" + JSON2.stringify(log_run_response);
                // this.log_message.push(message);



            } else {
                //log an error here.
                var error_log = "Error in _processXML function ::  the resulting object is not an array or object.";
                this.error_log.push(error_log);
                this.prepareError("log", error_log);
            }
        } catch (e) {
            var error_log = "Error in _processXML function :: " + e;
            this.error_log.push(error_log);
            this.prepareError("log", error_log)

        }

    },

    _archive: function(file) {
        this._log("ARCHIVAL START" + this.probeParameters["folder_location"]);
        // hardcoding for now.
        var archive_folder_name = this._calculateArchiveLocation(this.probeParameters["folder_location"] + '') + '';
        this._log("ARCHIVE FOLDER LOCATION" + archive_folder_name);
        var file_archive_folder_name = new Packages.java.io.File(archive_folder_name);
        // moving the file.
        this.FileUtils.moveToDirectory(file, file_archive_folder_name, true);


    },


    _processCSV: function(file) {
        this._log("inside process CSV");
        try {
            var table_name = this.probeParameters.config_importSetName; // for processing the XML and CSV, the table is
            // ALWAYS import setName.

            var jsonMapping = this.probeParameters["config_jsonMapping"] + '';

            var columnMapping = this.probeParameters["config_columnMapping"] + '';

            var columnMappingJSON = JSON2.parse(columnMapping);
            this._log(columnMapping);
            var header = this.probeParameters["isHeader"];


            // read the CSV files.
            var reader = new this.csv_reader(new this.file_reader(file), this.probeParameters.seperator);
            var count = 0;


            while ((next_line = reader.readNext()) != null) {
                var data_json = {};

                if (header == "true" && count == 0) {
                    count++;
                    continue
                }
                for (var key in columnMappingJSON) {

                    var value = (columnMappingJSON[key] + '') * 1

                    data_json[key] = next_line[value] + ''

                }
                // post the JSON.
                var import_set_name = this.probeParameters.config_importSetName + ''

                var import_set_url = this.probeParameters.instance_url + "api/now/import/" + import_set_name
                this._log("Posting to URL " + import_set_url);

                var response = this.API_wrapperMakeCallReusable("POST", JSON2.stringify(data_json), import_set_url);
                this._log(JSON2.stringify(response));


                count++;

            }
            this._archive(file);


        } catch (e) {
            var error_log = "Error in Process CSV function" + e;
            this.error_log.push(error_log);
            this.prepareError("log", error_log);
        }

    },



    getConfigurationParams: function(method, table_name, type) {
        var params = {};
        params["table_name"] = table_name + '';
        params["type"] = type + ''; // to specify we need to post to an import set.
        return params;
    },

    getPattern: function(obj, pattern) {

        pattern = '' + pattern;
        if (JSUtil.nil(pattern)) {
            //TODO: log an error;
        }

        if (typeof obj === 'string') {
            obj = JSON2.parse(obj);
        }
        var fieldNames = pattern.split('.');

        var interactiveObject = obj;
        for (var i = 0, len = fieldNames.length; i < len; i++) {
            var fieldName = fieldNames[i] + '';

            var arrayDetected = fieldName.split('[').length == 1 ? false : true;
            if (arrayDetected == true) {
                var lb = fieldName.indexOf('[');
                var rb = fieldName.indexOf(']');
                var arrayIndex = fieldName.slice(++lb, rb);
                var arrayKey = arrayIndex.split("=")[0];
                var arrayValue = arrayIndex.split("=")[1];
                var objectString = fieldName.slice(0, lb - 1);
                interactiveObject = interactiveObject[objectString];
                for (var j = 0, jlen = interactiveObject.length; j < jlen; j++) {

                    if (interactiveObject[j][arrayKey] == arrayValue) {

                        interactiveObject = interactiveObject[j];
                        break;
                    }
                }

            } else {

                interactiveObject = interactiveObject[fieldName];
            }
        }

        if (typeof interactiveObject === "undefined") return '';

        return interactiveObject;
    },




};
