// set of functions used to write to a CSV file.
// highly opinionated. You will have to pass the information like the Script Include asks you to.
// You should handle your own errors. You will get the set of errors as part of the response in MID Server Input
// You will also see a log if there is an error.


var PT_CSVWriter = Class.create();
PT_CSVWriter.prototype = {
    initialize: function() {

        // debug true or false.
        this.debug = true;

        this.debug_array = [];

        this.probe_params = this._getProbeParameters();
        mandatory_check_passed = this.mandatory_check(this.probe_params);
        if(!mandatory_check_passed){
            // not all mandatory fields are passed. Erroring out.
            var error = "Error with mandatory fields. Not all fields are passed.";
            this._log(error);
            this.debug_array.push(error);


        }
        try {
            this.open_csv = Packages.com.opencsv.CSVWriter;
            this.file_writer = Packages.java.io.FileWriter;
        }catch(e){
            var error = "Error with initializing Open CSV : " + e
            this._log(error);
            this.debug_array.push(error);
        }

    },

    write:function(){
        var writer;
        this._log("1. Inside the write function");
        try{
            if(!this._folderCheck(this.probe_params["folder_name"])){

                var error = "Error with folder creation. ";

                this._log(error);
                this.debug_array.push(error)
            }else{
                // create the CSV file.
                var final_file_path = this.probe_params.folder_name + this.probe_params.file_name;

                writer = new this.open_csv(new this.file_writer(final_file_path),this.probe_params.seperator);
                this._log(this.probe_params.csv_content);
                //write the entries.
                var entries = JSON2.parse(this.probe_params.csv_content);
                this._log("CSV Content ::" + this.probe_params.csv_content);
                for(var entry = 0, len = entries.length; entry<len; entry ++){

                    writer.writeNext(entries[entry]);
                }

            }
        }catch(e){
            var error = "Error writing the CSV to a file."
            this._log(error);
            this.debug_array.push(error)

        }finally{
            // close the connection.
            writer.close();
            return JSON2.stringify(this.debug_array);

        }
    },

    // utility functions.

    // get all probe parameters..

    _getProbeParameters:function(){
        var probe_params = {};
        probe_params.instance_url = this._getInstanceBaseURL(probe.getParameter("instance_name")) + '';
        probe_params.instanceUser = ms.getConfigParameter("mid.instance.username") + '';
        probe_params.instancePassword = ms.getConfigParameter("mid.instance.password") +'';
        probe_params.file_name = probe.getParameter("file_name") + '';
        probe_params.folder_name = this._cleanFolderPath(probe.getParameter("folder_name")) + '';
        probe_params.csv_content = probe.getParameter("csv_content") + '';
        var seperator = probe.getParameter("seperator")+'';
        this._log("the seperatoe is : " + seperator);
        if(JSUtil.nil(seperator) || seperator == 'null'){
            this._log(seperator)
            seperator = ",";
        }



        probe_params.seperator = seperator;

        return probe_params;
    },

    // instance url.
    _getInstanceBaseURL: function(instanceParameter) {
        var instanceBase = instanceParameter + '';
        if (instanceBase.lastIndexOf('/') != instanceBase.length - 1) {
            instanceBase += "/";
        }
        return instanceBase;
    },


    // clean folder path.
    _cleanFolderPath: function(instanceParameter) {
        var instanceBase = instanceParameter + '';
        if (instanceBase.lastIndexOf('\\') != instanceBase.length - 1) {
            instanceBase += "\\";
        }
        return instanceBase;
    },


    // does the folder exist? if not create it. You see, it eliminates a lot of _your_choices.
    _folderCheck:function(folder_name){
        var folder = new java.io.File(this.probe_params["folder_name"] + '');

        try{
            if(folder.isDirectory()){
                // the folder is already present. Paste the file.
                this._log("2. Folder already present.");
                return true;
            }else{
                // create that folder.
                this._log("2.1> Folder already not present.");
                folder = this.FileUtils.forceMkdir(folder);
                return true;
            }
        }catch(e){
            this._log("There is an error message with PostFile function. Something wrong with the folder creation = " + e )
            this._log("2.2 Folder creation unsuccessful.");
            return false;
        }

    },


    // mandatory check...
    mandatory_check:function(){
        var fields = ["file_name","folder_name","csv_content"]
        for(var i= 0, len = fields.length; i< len; i++){
            if(JSUtil.nil(this.probe_params[fields[i]])){
                return false;
            }
        }
        return true;

    },

    // logging.

    _log:function(message){
        if(!this.debug) return;
        ms.log(this.type + " : : : " + message);
    },

    type: 'PT_CSVWriter'
};