//modules json
var input;
var count; //anzahl elemente
//scheduler json
var sched;
var count2; //anzahl elemente

//Kategorien
var categ = [];

//URL des Rasperry Pi
var url_pi = "http://192.168.1.101/";

//timerintervall zum aktualisieren
var timerId1 = setInterval(gen_right, 30000);    //60,000 milliseconds
setInterval(showTime, 1000);

var pi_time;

function init()
{	
	pi_time = new Date();

	var url1 = url_pi+"modules";	
	loadJSON(url1,1,0,0);
}

function showTime()
{
	//Headertext
	var ti = "SmartHome ";

	//Clock
	var s = pi_time.getSeconds();
	var m = pi_time.getMinutes();
	var h = pi_time.getHours();

	s = s + 1;

	if(s == 60)
	{
		s = 0;
		m = m + 1;
		
		if(m == 60)
		{
			m = 0;
			h = h + 1;
			
			if(h == 24)
			{
				h = 0;
			}
		}
	}	

	pi_time.setSeconds(s);
	pi_time.setMinutes(m);
	pi_time.setHours(h);
	

	//Format
	if(pi_time.getHours() < 10)
	{
		ti = ti +"0" +pi_time.getHours();
	}else
	{
		ti = ti +pi_time.getHours();
	}

	ti = ti +":";

	if(pi_time.getMinutes() < 10)
	{
		ti = ti +"0" +pi_time.getMinutes();
	}else{
		ti = ti +pi_time.getMinutes();
	}

	ti = ti +":";	

	if(pi_time.getSeconds() < 10)
	{
		ti = ti +"0" +pi_time.getSeconds();
	}else
	{
		ti = ti +pi_time.getSeconds();
	}

	document.getElementById('head').innerHTML = ti;
}

function loadJSON(url,flag,id,sw)
{
   var data_file = url;
   var http_request = new XMLHttpRequest();
   
   try{
      // Opera 8.0+, Firefox, Chrome, Safari
      http_request = new XMLHttpRequest();
   }catch (e){
      // Internet Explorer Browsers
      try{
         http_request = new ActiveXObject("Msxml2.XMLHTTP");
      }catch (e) {
         try{
            http_request = new ActiveXObject("Microsoft.XMLHTTP");
         }catch (e){
            // Something went wrong
            alert("Your browser broke!");
            return false;
         }
      }
   }
      
   http_request.onreadystatechange  = function()
   {
      if (http_request.readyState == 4 && http_request.status == 200)
      {		
	  	if(flag == 1) //init json
		{
			var key;
			count=0;
			input = JSON.parse(http_request.responseText);
			
			for(key in input.modules)
			{
				if(input.modules.hasOwnProperty(key))
				{
					count++;
				}
			}	
					
			for(var j=0;j<count;j++)
			{
				categ[j] = input.modules[j].cat;
			}
			
			var uniqueArray = categ.filter(function(elem, pos) {
				return categ.indexOf(elem) == pos;
			}); 
			
			categ = uniqueArray;			
			gen_nav(count);
		}else if(flag == 2) //check status
		{
			var status = JSON.parse(http_request.responseText).status;
			
			if(status == "on")
			{
				gen_content2(id,true,-1,0);
			}else
			{
				gen_content2(id,false,-1,0);
			}
		}else if(flag == 3) //check status flip switch
		{
			var status2 = JSON.parse(http_request.responseText).status;
			
			if(status2 == "on")
			{
				if(sw.checked)
				{
					change_status("Module/" +input.modules[id].cat +"/" +input.modules[id].name+" is already on");
				}else
				{
					var url3 = url_pi +"modules/" +input.modules[id].name +"/set_off";
					send_data(url3,null,0,0);
				}
			}else
			{
				if(sw.checked)
				{
					var url3 = url_pi +"modules/" +input.modules[id].name +"/set_on";
					send_data(url3,null,0,0);					
				}else
				{
					change_status("Module/" +input.modules[id].cat +"/"+input.modules[id].name +" is already off");
				}
			}
		}else if(flag == 4) //load scheduler
		{
			sched = JSON.parse(http_request.responseText);
			count2 = 0;

			for(key in sched.status)
			{
				if(sched.status.hasOwnProperty(key))
				{
					count2++;
				}
			}	
			gen_content2(id,true,1,0);
		}else if(flag == 5) //load general sensor
		{
			var val = JSON.parse(http_request.responseText);
			gen_right2(val, id);
		}else if(flag == 6) //load servertime
		{
			var val = JSON.parse(http_request.responseText);
			setTime2(val);
		}
		
      }else{
		  //console.log("READYSTATE: "+http_request.readyState + " STATUS: "+http_request.status);
		  //alert("READYSTATE: "+http_request.readyState + " STATUS: "+http_request.status);
	  }
   }
   
   http_request.open("PUT", data_file, true);
   http_request.send(); 
}

function gen_nav(count)
{
	var navigation = "";
	
	for(var j=0;j<categ.length;j++)
	{
		if(categ[j] != "general")
		{
			navigation = navigation+"<li><h2>"+categ[j]+"</h2></li>";
			
			for(i=0;i<count;i++)
			{
				if(categ[j] == input.modules[i].cat)
				{	
					navigation = navigation +"<li><a href='javascript:void(0)' onclick='gen_content("+i+");'>" +input.modules[i].name +"</a></li>";	
				}
			}		
		}
	}
	document.getElementById('nav').innerHTML = navigation;	
	gen_right();	
}

function gen_right()
{
	for(var h=0;h<count;h++)
	{
		if(input.modules[h].cat == "general")
		{
			var url = url_pi + "modules/Sensor/sensor_data";
			loadJSON(url,5,h,null);
		}
	}
}

function gen_right2(val,id)
{
	var r = "<div id='table_right' class='dtable2'>";
							
	r = r + "<li><h3>" +input.modules[id].name +"</h3></li>";
	//r = r + "<li><h1>" +input.modules[id].module_name +"</h1></li>";
	r = r + "<li><h2>" +val.sensor.Temperature +"°C/"+val.sensor.Humidity +"%</h2></li>";
	
	r = r + "</div>";	
	document.getElementById('nav_r').innerHTML = r
	
	setTime();
}

function setTime()
{
	var url = url_pi +"time";
	loadJSON(url,6,null,null);
}

function setTime2(val)
{
	//alert(val.time.hour +":" +val.time.minute +":" +val.time.second);
	//pi_time = new Date();
	
	pi_time.setSeconds(val.time.second);
	pi_time.setMinutes(val.time.minute);
	pi_time.setHours(val.time.hour);
}

function gen_content(id)
{
	if(input.modules[id].type == "switch")
	{
		var url2 = url_pi +"modules/" +input.modules[id].name;
		loadJSON(url2,2,id,0);
	}else if(input.modules[id].type == "scheduler")
	{
		var url2 = url_pi +"jobs";
		loadJSON(url2,4,id,0);
	}else
	{
		gen_content2(id,true,-1,0);	
	}
}

function gen_content2(id,eingeschalten,flag,s_id)
{
	var s = "";
	var checked;
	document.getElementById('cont2').innerHTML = "";
		
	if(input.modules[id].type == "switch")
	{		
		s = "<li><h2>" +input.modules[id].name +"</h2></li><br><li><table class='colortable'><tr><td>modul_name</td><td>modul_addr</td><td>type</td><td>category</td></tr><tr><td>" +input.modules[id].module_name +"</td><td>" +input.modules[id].module_addr +"</td><td>" +input.modules[id].type +"</td><td>" +input.modules[id].cat +"</td></tr></table></li>";
		
		if(eingeschalten == true)
		{
			checked = "checked";
		}else 
		{
			checked = "unchecked";
		}
		s = s + "<li><br><div align='left'><div class='onoffswitch'><input type='checkbox' name='onoffswitch' class='onoffswitch-checkbox' id='switch_" +id +"'" +checked +" onclick='check_switch(switch_" +id +"," +id +");'><label class='onoffswitch-label' for='switch_" +id +"'><div class='onoffswitch-inner'><div class='onoffswitch-switch'></div></label></div></div></li>";		
		document.getElementById('cont').innerHTML = s;	
	}	
	else if(input.modules[id].type == "scheduler")
	{
		s =  "<li><h2>Jobs</h2></li><br><div id='table_content' class='dtable'>";		
		s = s + "<li><table class='colortable'><tr><td>job</td><td>device</td><td>Aktion</td><td>Y</td><td>M</td><td>w</td><td>d</td><td>DoW</td><td>h</td><td>m</td><td>s</td><td><span class='fui-cross'></span></td><td><span class='fui-gear'></span></td></tr>";		

		for(var x=0; x<count2; x++)
		{
			s = s + "<tr><td>" +sched.status[x].jobname+"</td><td>" +sched.status[x].device+"</td><td>" +sched.status[x].action +"</td><td>" +set_null(sched.status[x].year) +"</td><td>" +set_null(sched.status[x].month) +"</td><td>" +set_null(sched.status[x].week) +"</td><td>" +set_null(sched.status[x].day) +"</td><td>" +set_null(sched.status[x].day_of_week) +"</td><td>" +set_null(sched.status[x].hour) +"</td><td>" +set_null(sched.status[x].min) +"</td><td>" +set_null(sched.status[x].sec) +"</td><td><a href='javascript:void(0)' onclick='del_job(" +x +"," +id +");'><span class='fui-cross'></span></a></td><td><a href='javascript:void(0)' onclick='update_job(" +x +"," +id +");'><span class='fui-gear'></span></a></td></tr>";
		}		
		s = s + "</table></li>";			
		s = s + "</div>";		
		document.getElementById('cont').innerHTML = s;
		 
		 s = "";
		 
		 if(flag == 1) //New Job Field
		 {		 
			s = s +"<li><h3>New Job: <input type='text' id='txt_job_name' name='txt_job_name' placeholder='job_name'></h3></li><li><table class='colortable'><tr><td>device</td><td colspan='3'>Zeit</td>";
			//<td rowspan='4'><input type='button' name='module_butt' class='sinput_butt' value='+' onclick='new_job("+id+")'></td>
			s = s +"</tr><tr><td rowspan='1'><select class='sinput_drop' id='module_select' name='module_select'>";
			for(var y=0; y<count; y++)
			{
				if(input.modules[y].type == "switch")
				{
					if(input.modules[y].cat != "general")
					{
						s = s +"<option>"+input.modules[y].name+"</option>";
					}
				}
			}
			s = s + "</select>";	
			s = s + "<td><input type='text' id='txt_year' name='txt_year' placeholder='year'></td><td><input type='text' id='txt_month' name='txt_month' placeholder='month'></td><td><input type='text' id='txt_week' name='txt_week' placeholder='week'></td></tr><tr><td rowspan='2'>";			
			s = s + "Aktion:<select class='sinput_drop' id='module_op' name='module_op'><option>ein</option><option>aus</option></select>";			
			s = s + "</td><td><input type='text' id='txt_day' name='txt_day' placeholder='day'></td><td colspan='2'><input type='text' id='txt_day_of_week' name='txt_day_of_week' placeholder='day_of_week'></td></tr><tr><td><input type='text' id='txt_hour' name='txt_hour' placeholder='hour'></td><td><input type='text' id='txt_min' name='txt_min' placeholder='min'></td><td><input type='text' id='txt_sec' name='txt_sec' placeholder='sec'></td></tr></table></li>";
			s = s + "<td><input type='button' name='job_ok' class='' value='ok' onclick='new_job(" +id +")'></td>";	

		 }else if(flag==0) //Update Job Field
		 {
			 s = s + "<h3><li>Update Job: <input type='text' id='txt_job_name' name='txt_job_name' placeholder='job_name' value='" +sched.status[s_id].jobname+"' disabled></h3></li>";
			 s = s + "<li><table class='colortable'><tr><td>Gerät</td><td colspan='3'>Zeit</td>";
			 //s = s + "<td rowspan='4'><input type='button' name='module_butt' class='sinput_butt' value='+' onclick='update_job2(" +id +")'>";
			 s = s + "</td></tr><tr><td rowspan='1'><select class='sinput_drop' id='module_select' name='module_select'>";
			 
			for(var y=0; y<count; y++)
			{
				if(input.modules[y].type == "switch")
				{
					if(input.modules[y].cat != "general")
					{
						if(input.modules[y].name == sched.status[s_id].device)
						{
							s = s +"<option selected>"+input.modules[y].name+"</option>";					
						}else
						{
							s = s +"<option>"+input.modules[y].name+"</option>";	
						}
					}
				}
			}
			s = s + "</select>";	
			s = s +"<td><input type='text' id='txt_year' name='txt_year' placeholder='year' value='" +set_leer(sched.status[s_id].year) +"'></td><td><input type='text' id='txt_month' name='txt_month' placeholder='month' value='" +set_leer(sched.status[s_id].month) +"'></td><td><input type='text' id='txt_week' name='txt_week' placeholder='week' value='" +set_leer(sched.status[s_id].week) +"'></td></tr><tr><td rowspan='2'>";			
			s = s + "Aktion:<select class='sinput_drop' id='module_op' name='module_op'>";
			
			if(sched.status[s_id].status == "on")
			{
				s = s +"<option selected>ein</option><option>aus</option>";
			}else{
				s = s +"<option>ein</option><option selected>aus</option>";
			}
			
			s = s + "</select>";			
			s = s + "</td><td><input type='text' id='txt_day' name='txt_day' placeholder='day' value='"+set_leer(sched.status[s_id].day)+"'></td><td colspan='2'><input type='text' id='txt_day_of_week' name='txt_day_of_week' placeholder='day_of_week' value='"+set_leer(sched.status[s_id].day_of_week)+"'></td></tr><tr><td><input type='text' id='txt_hour' name='txt_hour' placeholder='hour' value='" +set_leer(sched.status[s_id].hour) +"'></td><td><input type='text' id='txt_min' name='txt_min' placeholder='min' value='" +set_leer(sched.status[s_id].min) +"'></td><td><input type='text' id='txt_sec' name='txt_sec' placeholder='sec' value='" +set_leer(sched.status[s_id].sec)+"'></td></tr></table></li>";
		
			s = s +"<td><input type='button' name='cancel' class='' value='cancel' onclick='back(" +id +")'>";
			s = s +"<input type='button' name='job_ok' class='' value='ok' onclick='update_job2(" +id +")'></td>"; 
		}
		document.getElementById('cont2').innerHTML = s;
	}	
}

function back(id)
{
	var url = url_pi +"jobs";
	loadJSON(url,4,id,0);
}

function check_switch(sw,id)
{	
	var url3 = url_pi +"modules/" +input.modules[id].name;
	loadJSON(url3,3,id,sw);
}

function send_data(url,nachricht,flag,id)
{
    var xmlHttp;
    try
    {
  	  /* Firefox, Opera 8.0+, Safari */
    	xmlHttp=new XMLHttpRequest();
    }
    catch (e)
    {
		/* newer IE */
		try
		{
		  xmlHttp=new ActiveXObject("Msxml2.XMLHTTP");
		}
		catch (e)
		{
		  /* older IE */
		  try
		  {
			xmlHttp=new ActiveXObject("Microsoft.XMLHTTP");
		  }
		  catch (e)
		  {
			alert("Your browser is old and does not have AJAX support!");
			return false;
		  }
        }
    }
	
  xmlHttp.onreadystatechange=function()
  {
    if(xmlHttp.readyState==4)
    {
      /* this puts the value into an alert */
      //alert("Value read is: "+xmlHttp.responseText);
    }
  }
  xmlHttp.open("PUT",url,true);
  xmlHttp.overrideMimeType('application/json');
  xmlHttp.send(nachricht);
  
  //change_status(url+' done');
  console.log("URL: " +url +" MSG: " +nachricht+" gesendet");
  
  if(flag==1) //reload wenn ein job eingetragen/geupdated wird
  {
		//alert("reload scheduler");
		var url10 = url_pi +"jobs";
		loadJSON(url10,4,id,0);
  }
}

function set_null(m)
{
	if(m == "")
	{
		return 0;
	}else if(m == null)
	{
		return 0;
	}else
	{
		return m;
	}
}

function set_leer(m)
{
	if(m == 0)
	{
		return "";
	}else if(m == null)
	{
		return "";
	}else
	{
		return m;
	}
}

function set_none(m)
{
	if(m == 0)
	{
		return "None";
		//return "\"None\"";
	}else{
		return m;
	}
}

function new_job(id)
{
	var m = document.getElementById("module_select");
	var device = m.options[m.selectedIndex].text;
	var o = document.getElementById("module_op");
	var op = o.options[o.selectedIndex].text;	
	var year = document.getElementById("txt_year").value;
	var month = document.getElementById("txt_month").value;
	var week = document.getElementById("txt_week").value;
	var day = document.getElementById("txt_day").value;
	var day_of_week = document.getElementById("txt_day_of_week").value;
	var hour = document.getElementById("txt_hour").value;
	var minute = document.getElementById("txt_min").value;
	var sec = document.getElementById("txt_sec").value;
	var job_name = document.getElementById("txt_job_name").value;
	
	if(isNaN(year))
	{
		alert('Bitte eine Zahl eingeben (year)');
	}else
	{
		if(isNaN(month))
		{
			alert('Bitte eine Zahl eingeben (month)');
		}else
		{
			if(isNaN(week))
			{
				alert('Bitte eine Zahl eingeben (week)');
			}else
			{
				if(isNaN(day))
				{
					alert('Bitte eine Zahl eingeben (day)');
				}else
				{
					if(isNaN(day_of_week))
					{
						alert('Bitte eine Zahl eingeben (day_of_week)');
					}else
					{
						if(isNaN(hour))
						{
							alert('Bitte eine Zahl eingeben (hour)');
						}else
						{
							if(isNaN(minute))
							{
								alert('Bitte eine Zahl eingeben (min)');
							}else
							{
								if(isNaN(sec))
								{
									alert('Bitte eine Zahl eingeben (sec)');
								}else
								{
									if(job_name=="")
									{
										alert('Bitten einen Jobnamen eingeben');
									}else
									{
										year=set_null(year);
										month=set_null(month);
										week=set_null(week);
										day=set_null(day);
										day_of_week=set_null(day_of_week);
										hour=set_null(hour);
										minute=set_null(minute);
										sec=set_null(sec);						
										
										//console.log("new job (year: "+year+" month: "+month+" week: "+week+" day: "+day+" day_of_week: "+day_of_week+" hour: "+hour+" min: "+minute+" sec: "+sec+")");										
										var msg = "{"
										var msg2 = "/"+device+"/";										

										if(op == "ein" || op == "on" || op == "set_on")
										{
											msg = msg + "\"action\": \"set_on\",";
											msg2 = msg2 + "on/";
											
										}else if(op == "aus" || op == "off" || op == "set_off")
										{
											msg = msg + "\"action\": \"set_off\",";
											msg2 = msg2 + "off/";
										}
										
										msg = msg +"\"device\":\""+device+"\",\"year\":"+year+",\"month\":"+month+",\"week\":"+week+",\"day\":"+day+",\"day_of_week\":"+day_of_week+",\"hour\":"+hour+",\"minute\":"+minute+",\"second\":"+sec+"}";
										msg2 = msg2 + set_none(year) +"/"+set_none(month) +"/" +set_none(week) +"/" +set_none(day) +"/" +set_none(day_of_week) +"/" +set_none(hour) +"/" +set_none(minute) +"/" +set_none(sec);									
										var job_url = url_pi +"jobs/create/" +job_name;
										var job_test = job_url +msg2;
										//alert(job_test);

										change_status("neuer Job eingetragen ("+job_name+")");
										//send_data(job_url,msg,1,id);
										send_data(job_test,null,1,id);
									}
								}
							}
						}
					}
				}
			}
		}
	}
}

function del_job(id,module_id)
{
	var job_url = url_pi +"jobs/delete/" +sched.status[id].jobname;
	var msg = null;
	change_status("Job gelöscht (" +sched.status[id].jobname +")");
	send_data(job_url,msg,1,module_id);
}

function update_job(id,module_id)
{
	var job_url = url_pi +"jobs/update/" +sched.status[id].jobname;
	var msg = "";
	gen_content2(module_id,false,0,id);
}

function update_job2(id)
{
	var m = document.getElementById("module_select");
	var device = m.options[m.selectedIndex].text;
	var o = document.getElementById("module_op");
	var op = o.options[o.selectedIndex].text;	
	var year = document.getElementById("txt_year").value;
	var month = document.getElementById("txt_month").value;
	var week = document.getElementById("txt_week").value;
	var day = document.getElementById("txt_day").value;
	var day_of_week = document.getElementById("txt_day_of_week").value;
	var hour = document.getElementById("txt_hour").value;
	var minute = document.getElementById("txt_min").value;
	var sec = document.getElementById("txt_sec").value;
	var job_name = document.getElementById("txt_job_name").value;
	
	if(isNaN(year))
	{
		alert('Bitte eine Zahl eingeben (year)');
	}else
	{
		if(isNaN(month))
		{
			alert('Bitte eine Zahl eingeben (month)');
		}else
		{
			if(isNaN(week))
			{
				alert('Bitte eine Zahl eingeben (week)');
			}else
			{
				if(isNaN(day))
				{
					alert('Bitte eine Zahl eingeben (day)');
				}else
				{
					if(isNaN(day_of_week))
					{
						alert('Bitte eine Zahl eingeben (day_of_week)');
					}else
					{
						if(isNaN(hour))
						{
							alert('Bitte eine Zahl eingeben (hour)');
						}else
						{
							if(isNaN(minute))
							{
								alert('Bitte eine Zahl eingeben (min)');
							}else
							{
								if(isNaN(sec))
								{
									alert('Bitte eine Zahl eingeben (sec)');
								}else
								{
									if(job_name=="")
									{
										alert('Bitten einen Jobnamen eingeben');
									}else
									{
										year=set_null(year);
										month=set_null(month);
										week=set_null(week);
										day=set_null(day);
										day_of_week=set_null(day_of_week);
										hour=set_null(hour);
										minute=set_null(minute);
										sec=set_null(sec);						
										
										//console.log("update job (year: "+year+" month: "+month+" week: "+week+" day: "+day+" day_of_week: "+day_of_week+" hour: "+hour+" min: "+minute+" sec: "+sec+")");
										var msg = "{"
										var msg2 = "/"+device+"/";

										if(op == "ein" || op == "on" || op == "set_on")
										{
											msg = msg + "\"action\": \"set_on\",";
											msg2 = msg2 + "on/";
											
										}else if(op == "aus" || op == "off" || op == "set_off")
										{
											msg = msg + "\"action\": \"set_off\",";
											msg2 = msg2 + "off/";
										}
										
										msg = msg +"\"device\":\""+device+"\",\"year\":"+year+",\"month\":"+month+",\"week\":"+week+",\"day\":"+day+",\"day_of_week\":"+day_of_week+",\"hour\":"+hour+",\"minute\":"+minute+",\"second\":"+sec+"}";
										msg2 = msg2 + set_none(year) +"/"+set_none(month) +"/" +set_none(week) +"/" +set_none(day) +"/" +set_none(day_of_week) +"/" +set_none(hour) +"/" +set_none(minute) +"/" +set_none(sec);	
										var job_url=url_pi +"jobs/update/"+job_name;
										var job_test = job_url +msg2;
										change_status("Job aktualisiert (" +job_name+")");
										//send_data(job_url,msg,1,id);
										send_data(job_test,null,1,id);
									}
								}
							}
						}
					}
				}
			}
		}
	}
}

//Schreibt Nachrichten in die Statusbar/Konsole
function change_status(message)
{
	document.getElementById('status').innerHTML = message;
	console.log(message);
}

function sleep(milliSeconds){
	var startTime = new Date().getTime(); // get the current time
	while (new Date().getTime() < startTime + milliSeconds); // hog cpu
}
