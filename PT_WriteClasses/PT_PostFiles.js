// No fancy error handling here. Log the error on the MID server. Search for Prefix of "PT_FileImporter::".

var PT_PostFiles = Class.create();

PT_PostFiles.prototype = {

    initialize:function(){


        //read all probe parameters.
        this.probe_params = this._getProbeParameters();
        this.debugString = '';
        this.debug = false;

        // file utils.
        this.FileUtils = new Packages.org.apache.commons.io.FileUtils();

        //string utils
        this.StringUtil = Packages.com.glide.util.StringUtil;

        this.debug = false;
        this.debug_prefix = "PT_FileImporter ::";

    },


    postFile:function(){
        // check if we have the folder already existing, if so retrieve it.
        var folder = new java.io.File(this.probe_params["folder_name"] + '');

        try{
            if(folder.isDirectory()){
                // the folder is already present. Paste the file.
                this._log("1. Folder is already present")
                this.createFile();
            }else{
                // create that folder.
                this._log("2. Folder is not already present")
                folder = this.FileUtils.forceMkdir(folder);
                this.createFile();

            }
        }catch(e){
            this._log("There is an error message with PostFile function. Something wrong with the folder creation = " + e )
        }

    },

    createFile:function(){


        var folder_name = this.probe_params.folder_name + '';
        folder_name = this._cleanFolderPath(folder_name);
        var file_name  = this.probe_params.file_name + '';

        var file_path = folder_name + file_name;
        this._log("4. file path =  " + file_path)
        var file_object = new java.io.File(file_path);
        var base64 = this.probe_params.base64;
        // decoding base64 back.
        var bytes = this.StringUtil.base64DecodeAsBytes(base64);

        try{

            // write the file.
            this.FileUtils.writeByteArrayToFile(file_object,bytes);
        }catch(e){
            this._log("Error writing to file, and the exception is " + e);
        }

    },


    // utility functions.
    _getProbeParameters:function(){
        var probe_params = {};
        probe_params.instance_url = this._getInstanceBaseURL(probe.getParameter("instance_name"));
        probe_params.instanceUser = ms.getConfigParameter("mid.instance.username") + '';
        probe_params.instancePassword = ms.getConfigParameter("mid.instance.password") +'';
        probe_params.file_name = probe.getParameter("file_name") + '';
        probe_params.base64 = probe.getParameter("base64") + '';
        probe_params.folder_name = probe.getParameter("folder_name") + '';
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

    // logging.

    _log:function(message){
        if(!this.debug) return;
        ms.log(this.debug_prefix + " : : : " + message);
    },


};