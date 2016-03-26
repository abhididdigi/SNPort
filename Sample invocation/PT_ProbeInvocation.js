var jp = new JavascriptProbe(this.record.u_mid_server_name.name);
jp.addParameter("scheduled_job_run",this.scheduled_job_run.sys_id);
jp.addParameter("instance_name",gs.getProperty("glide.servlet.uri"));
jp.setName("PT_PDFFIleIpoter");
jp.setJavascript("var ptf = new PT_FileImporter(); ptf.MID_HandleFiles()");
var probe_sys_id = probe.create();
		