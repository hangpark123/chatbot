//페이지 접속 시 init 실행
init();

var KSign_Base64 = {

	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
		
		input = KSign_Base64._utf8_encode(input);

		while (i < input.length) {

			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

		}

		return output;
	},

	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {

			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode(chr1);

			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}

		}

		output = KSign_Base64._utf8_decode(output);

		return output;

	},

	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		//string = string.replace(/\r\n/g,"\r\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}

		}

		return utftext;
	},

	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while ( i < utftext.length ) {

			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}

		}

		return string;
	},
	
	// public method for binary encoding
	binencode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;

		while (i < input.length) {

			chr1 = input[i++];
			chr2 = input[i++];
			chr3 = input[i++];

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

		}

		return output;
	},
	
	// public method for binary decoding
	bindecode : function (input) {
		var output = [];
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		var nOut=0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		
		while (i < input.length) {

			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output[nOut++]=parseInt(chr1,10);

			if (enc3 != 64) {
				output[nOut++]=parseInt(chr2,10);
			}
			if (enc4 != 64) {
				output[nOut++]=parseInt(chr3,10);
			}
			
			chr1=chr2=chr3="";
			enc1=enc2=enc3=enc4="";
		}

		return output;

	},
	
	// public method for hexa encoding
	hex2b64 : function (h) {
		var i;
		var c;
		var b64pad="=";
		var ret = "";
		for(i = 0; i+3 <= h.length; i+=3) {
			c = parseInt(h.substring(i,i+3),16);
			ret += this._keyStr.charAt(c >> 6) + this._keyStr.charAt(c & 63);
		}
		if(i+1 == h.length) {
			c = parseInt(h.substring(i,i+1),16);
			ret += this._keyStr.charAt(c << 2);
		}
		else if(i+2 == h.length) {
			c = parseInt(h.substring(i,i+2),16);
			ret += this._keyStr.charAt(c >> 2) + this._keyStr.charAt((c & 3) << 4);
		}
		while((ret.length & 3) > 0) ret += b64pad;
		return ret;

	}
}


function init(){
	$(document).ready(function (){
	/*	인증서 필터 기능은 전체 주석인 경우는 전체 인증서, 활성화하면 해당 인증서만 인증서 창에 보이게 됩니다.
///////////////////////////////////////////////NPKI///////////////////////////////////////////////
		// 금융결제원
		kcaseagt.addCertPolicy("1.2.410.200005.1.1.1"); // 상호연동 - 개인
		kcaseagt.addCertPolicy("1.2.410.200005.1.1.5"); // 상호연동 - 법인
		kcaseagt.addCertPolicy("1.2.410.200005.1.1.4"); // 용도 제한 - 개인(은행)
		kcaseagt.addCertPolicy("1.2.410.200005.1.1.6.2"); // 용도 제한 - 개인(신용카드)
		kcaseagt.addCertPolicy("1.2.410.200005.1.1.2"); // 용도 제한 - 법인 
		// 한국정보인증
		kcaseagt.addCertPolicy("1.2.410.200004.5.2.1.2"); // 상호연동 - 개인
		kcaseagt.addCertPolicy("1.2.410.200004.5.2.1.1"); // 상호연동 - 법인
		kcaseagt.addCertPolicy("1.2.410.200004.5.2.1.7.1"); // 용도 제한 - 개인(은행)
		kcaseagt.addCertPolicy("1.2.410.200004.5.2.1.7.2"); // 용도 제한 - 개인(증권)
		kcaseagt.addCertPolicy("1.2.410.200004.5.2.1.7.3"); // 용도 제한 - 개인(신용카드)
		// 코스콤
		kcaseagt.addCertPolicy("1.2.410.200004.5.1.1.5"); // 상호연동(Platinum) - 개인
		kcaseagt.addCertPolicy("1.2.410.200004.5.1.1.7"); // 상호연동(Platinum) - 법인
		kcaseagt.addCertPolicy("1.2.410.200004.5.1.1.1"); // 용도 제한(Special) - 개인
		kcaseagt.addCertPolicy("1.2.410.200004.5.1.1.3"); // 용도 제한(Special) - 법인
		kcaseagt.addCertPolicy("1.2.410.200004.5.1.1.9"); // 용도 제한(Gold) - 개인
		kcaseagt.addCertPolicy("1.2.410.200004.5.1.1.10"); // 용도 제한(Gold) - 법인
		kcaseagt.addCertPolicy("1.2.410.200004.5.1.1.11"); // 용도 제한(Silver) - 개인
		kcaseagt.addCertPolicy("1.2.410.200004.5.1.1.12"); // 용도 제한(Silver) - 법인
		// 한국전자인증
		kcaseagt.addCertPolicy("1.2.410.200004.5.4.1.1"); // 상호연동 - 개인
		kcaseagt.addCertPolicy("1.2.410.200004.5.4.1.2"); // 상호연동 - 법인
		kcaseagt.addCertPolicy("1.2.410.200004.5.4.1.101"); // 용도 제한 - 개인(은행)
		kcaseagt.addCertPolicy("1.2.410.200004.5.4.1.102"); // 용도 제한 - 개인(증권)
		kcaseagt.addCertPolicy("1.2.410.200004.5.4.1.103"); // 용도 제한 - 개인(신용카드)
		kcaseagt.addCertPolicy("1.2.410.200004.5.4.1.5"); // 용도 제한 - 법인
		// 한국무역정보통신
		kcaseagt.addCertPolicy("1.2.410.200012.1.1.1"); // 상호연동 - 개인
		kcaseagt.addCertPolicy("1.2.410.200012.1.1.3"); // 상호연동 - 법인
		kcaseagt.addCertPolicy("1.2.410.200012.1.1.101"); // 용도 제한 - 개인(은행)
		kcaseagt.addCertPolicy("1.2.410.200012.1.1.103"); // 용도 제한 - 개인(증권)
		kcaseagt.addCertPolicy("1.2.410.200012.1.1.105"); // 용도 제한 - 개인(신용카드)
		kcaseagt.addCertPolicy("1.2.410.200012.1.1.9"); // 용도 제한 - 법인
///////////////////////////////////////////////NPKI///////////////////////////////////////////////

///////////////////////////////////////////////EPKI///////////////////////////////////////////////
		kcaseagt.addCertPolicy("1.2.410.100001.5.3.1.3"); // 개인용
		kcaseagt.addCertPolicy("1.2.410.100001.5.3.1.1"); // 기관용 - 전자관인
		kcaseagt.addCertPolicy("1.2.410.100001.5.3.1.7"); // 기관용 - 컴퓨터용 
		kcaseagt.addCertPolicy("1.2.410.100001.5.3.1.9"); // 기관용 - SSL
		kcaseagt.addCertPolicy("1.2.410.100001.5.3.1.5"); // 특수목적용
///////////////////////////////////////////////EPKI///////////////////////////////////////////////

///////////////////////////////////////////////GPKI///////////////////////////////////////////////
		kcaseagt.addCertPolicy("1.2.410.100001.2.2.1"); // 개인용 - 공무원용
		kcaseagt.addCertPolicy("1.2.410.100001.2.1.1"); // 기관용 - 전자관인
		kcaseagt.addCertPolicy("1.2.410.100001.2.1.2"); // 기관용 - 컴퓨터용 
		kcaseagt.addCertPolicy("1.2.410.100001.2.1.3"); // 기관용 - 전자특수관인
///////////////////////////////////////////////GPKI///////////////////////////////////////////////
	*/
		
		/*************************************************************************************
		아카넷 수정 : 공인인증서 보안모듈 설치 성공 및 미설치 함수만 수정
		*************************************************************************************/
		
		kcaseagt.checkInstallAgent({

			success: function() {
				//alert("success");
				kcaseagt.init({
					libRoot: libPath,
					sessId: "",
					mainTitle: "전자서명",
					adminTitle: "인증서 관리",			
					// 인증서 창 위치 조절
					position: "center",    // "top", "center", "bottom"
					// 인증서 매체 선택 가능
					mediaOpt: 	kcaseagt.enable.harddisk | 	//하드디스크
						kcaseagt.enable.remdisk | 	//이동식디스크
						kcaseagt.enable.savetoken | 	//이동식디스크
						kcaseagt.enable.pkcs11  ,	//보안토큰
						//kcaseagt.enable.ubikey		//유비키
						//kcaseagt.enable.all,			//전체 사용
					
					success: function() {
						//성공 시 보안모듈 설치여부체크 함수 호출하도록 수정
						$.installStatus("Y");
					},
		            error: function(errCode, errMsg) {
		                alert(errCode + ": "+ errMsg);
		                location.href = file;
		            },
		            serviceError: function() {
		            	//설치 여부는 index 페이지에서 처리하므로 주석 처리함
		                //alert("보안 모듈이 설치되지 않았습니다.");
		                //location.href = file;
		            	$.installStatus("N");
		            },
		            sessionError: function() {
		                alert("인증서 세션이 만료되어 페이지를 새로고침합니다.");
		                location.reload();
		            },
		            noUbiKey: function() {
		                alert("유비키 미설치");
		            }
				});
			},
			error: function(errCode, errMsg) {
				//보안모듈 버전변경 시 Error Code : 32797
				if (errCode=="32797") {
					$.installStatus("U");
				//보안모듈 미설치 시 Error Code : 32803
				}else {
					$.installStatus("N");
				}
			}
		});
	});
}


function makeSerialForm(objForm)
{
	var strSerialForm = "";
 	var startFlag = false;
 	
	for(i = 0; i < objForm.elements.length; i++)
	{
		if(objForm.elements[i].type == "hidden")
		{
			;
		}
		else if ((objForm.elements[i].type != "submit") && (objForm.elements[i].type != "reset") && (objForm.elements[i].type != "button"))
		{
			if (objForm.elements[i].type == "radio" || objForm.elements[i].type == "checkbox")
		    {
				if (objForm.elements[i].checked == true)
				{
					if(startFlag)
						strSerialForm += "&";
					else
						startFlag = true;

					if (objForm.elements[i].value.length > 0)						
						strSerialForm += objForm.elements[i].value;
				}
			}
			else
			{
				if (objForm.elements[i].type == "select-one")
				{
					if (startFlag )
						strSerialForm += "&";
					else
						startFlag = true;

					if (objForm.elements[i].options[objForm.elements[i].selectedIndex].value != '')						
						strSerialForm += objForm.elements[i].options[objForm.elements[i].selectedIndex].value;
					else						
						strSerialForm += objForm.elements[i].options[objForm.elements[i].selectedIndex].text;
				}
				else if (objForm.elements[i].type == "select-multiple")
				{
					for (j = 0; j < objForm.elements[i].options.length; j++)
					{
						if (objForm.elements[i].options[j].selected == true)
						{
							if (startFlag )
								strSerialForm += "&";
							else
								startFlag = true;

							if (objForm.elements[i].options[j].value != '')
								strSerialForm += objForm.elements[i].options[j].value;
							else								
								strSerialForm += objForm.elements[i].options[j].text;
						}
					}
					
				}
				else
				{
					if (startFlag )
						strSerialForm += "&";
					else
						startFlag = true;

					//strSerialForm += objForm.elements[i].name + "=";

					if (objForm.elements[i].value.length > 0)
					{
						//strSerialForm += AxKCASE.ComBASE64Encode(objForm.elements[i].value);						
						strSerialForm += objForm.elements[i].value;						
					}
				}
			}
		}
	}
	
	return strSerialForm;
}


function AdminDialog(){
	kcaseagt.openAdminDialog();
}

function SignedData(form){
	var eucplainData;
	var  utfPlainData;
	var plainData ;
	var SSN;
	// SignedData CharSet 처리 = euckr :: utf8 :: none
	plainData = form.id.value + "&&charset=utf8";
	//plainData = form.id.value + "&&charset=euckr";
	//plainData = form.id.value;
	alert(plainData);

    kcaseagt.genSignData({
        input: plainData,
        success: function (output) {
        	form.signed_data.value = output;
        	form.submit();
        },
        error: function (c, msg) {
        	alert(c + ": "+ msg);
        }
    }); 
}

function EnvelopData(form){
	var plainData = form.id.value + "&" + form.pwd.value;
	
    kcaseagt.genEnvelopedData({
        algorithm: kcaseagt.algorithm.SEED,
        //서버인증서 ksign
        peerCert: "MIID6DCCAtCgAwIBAgICBSYwDQYJKoZIhvcNAQEFBQAwOjELMAkGA1UEBhMCa3IxDjAMBgNVBAoMBWtzaWduMQwwCgYDVQQLDANwa2kxDTALBgNVBAMMBHJvb3QwHhcNMDkwMzEyMDcyNzAwWhcNMjkwMzEyMDcyNjU5WjA5MQswCQYDVQQGEwJrcjEOMAwGA1UECgwFa3NpZ24xDDAKBgNVBAsMA3BraTEMMAoGA1UEAwwDc3NvMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALu/R0lBXpXE71fd2fCQbcG97+VuoYFE5m/z3v3GTHTT4ZO3bJX1fKtl4LbzexPV7u4NaWpEkCnHSMlvWeBWhO8CAwEAAaOCAb8wggG7ME8GCCsGAQUFBwEBBEMwQTA/BggrBgEFBQcwAoYzbGRhcDovLzEwLjEwLjExLjEwNjozODkvY249cm9vdCxvdT1wa2ksbz1rc2lnbixjPWtyMGMGA1UdIwRcMFqAFO9Anr0B41pyCs/ntcapvmUisQYAoT6kPDA6MQswCQYDVQQGEwJrcjEOMAwGA1UECgwFa3NpZ24xDDAKBgNVBAsMA3BraTENMAsGA1UEAwwEcm9vdIICA7YwHQYDVR0OBBYEFC6VYaINlaHGo8e1K9cgjJf+rOylMA4GA1UdDwEB/wQEAwIGwDBBBgNVHSABAf8ENzA1MDMGBCoDBAYwKzApBggrBgEFBQcCARYdaHR0cDovL3d3dy5rc2lnbi5jb20vY3BzLmh0bWwwJgYDVR0SBB8wHaAbBgkqgxqMmkQKAQGgDjAMDAoo7KO8KUtTaWduMGkGA1UdHwRiMGAwXqBcoFqGWGxkYXA6Ly8xMC4xMC4xMS4xMDY6Mzg5L2NuPWNkcDZwMSxvdT1jcmxkcCxvdT1wa2ksbz1rc2lnbixjPWtyP2NlcnRpZmljYXRlUmV2b2NhdGlvbkxpc3QwDQYJKoZIhvcNAQEFBQADggEBALg0SjFXhqvCnG/oJm+YsGlCWg2+YPvvJBljIvbtqhvyhHDuzL+t9XwrCjnbur2RR0y1OAULq2LL37JUDtQ1XWPUvvTJQ6c7ZzNxDfiAlwiyEiZKGjpwO6epoq7emWxR4p6VoNR8FCStRIVsgXst2sX6nEin6+Wqt8t5nWZfFp0U2qBcRLpJINM8TQ4qa0APmgYorq98LmIgO+QfjaZsGng3xYnlRCBzEd03y9L7As8nHDx5/jGsomrwcCEfRFUMimxdhMp/L3+YmNjLFN47Rqur4PFLKnb5nRdRtT5gPz3DHf8DSSrFZp9MOoVvJGdmTW+izfS/X5Ea+waWABBCiro=",
        input: plainData,
        success: function(output) {
        	form.envelop_data.value = output;
        	form.submit();
        },
        error: function (c, msg) {
        	alert(c + ": "+ msg);
        }
    });
}

function VID(form){
	var Vid ; 	
	var PlainData ;
	
	
	// SignedData CharSet 처리 = euckr :: utf8 :: none
	Vid = form.vid.value;
	//Vid = form.vid.value + "&&charset=euckr";
	//Vid = form.vid.value;
	//PlainData = kcaseagt.encode64(kcaseagt.encodeUtf8(Vid));
	//PlainData = kcaseagt.encode64(kcaseagt.encodeUtf8(Vid));
	//PlainData = KSign_Base64.encode(Vid); 
	//alert(PlainData);
	//PlainData = KSign_Base64.encode(Vid); 
	//var sPlainData = KSign_Base64.decode(PlainData);
	
	kcaseagt.getVidInfo({
		//서버인증서 ksign
		peerCert: "MIID6DCCAtCgAwIBAgICBSYwDQYJKoZIhvcNAQEFBQAwOjELMAkGA1UEBhMCa3IxDjAMBgNVBAoMBWtzaWduMQwwCgYDVQQLDANwa2kxDTALBgNVBAMMBHJvb3QwHhcNMDkwMzEyMDcyNzAwWhcNMjkwMzEyMDcyNjU5WjA5MQswCQYDVQQGEwJrcjEOMAwGA1UECgwFa3NpZ24xDDAKBgNVBAsMA3BraTEMMAoGA1UEAwwDc3NvMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALu/R0lBXpXE71fd2fCQbcG97+VuoYFE5m/z3v3GTHTT4ZO3bJX1fKtl4LbzexPV7u4NaWpEkCnHSMlvWeBWhO8CAwEAAaOCAb8wggG7ME8GCCsGAQUFBwEBBEMwQTA/BggrBgEFBQcwAoYzbGRhcDovLzEwLjEwLjExLjEwNjozODkvY249cm9vdCxvdT1wa2ksbz1rc2lnbixjPWtyMGMGA1UdIwRcMFqAFO9Anr0B41pyCs/ntcapvmUisQYAoT6kPDA6MQswCQYDVQQGEwJrcjEOMAwGA1UECgwFa3NpZ24xDDAKBgNVBAsMA3BraTENMAsGA1UEAwwEcm9vdIICA7YwHQYDVR0OBBYEFC6VYaINlaHGo8e1K9cgjJf+rOylMA4GA1UdDwEB/wQEAwIGwDBBBgNVHSABAf8ENzA1MDMGBCoDBAYwKzApBggrBgEFBQcCARYdaHR0cDovL3d3dy5rc2lnbi5jb20vY3BzLmh0bWwwJgYDVR0SBB8wHaAbBgkqgxqMmkQKAQGgDjAMDAoo7KO8KUtTaWduMGkGA1UdHwRiMGAwXqBcoFqGWGxkYXA6Ly8xMC4xMC4xMS4xMDY6Mzg5L2NuPWNkcDZwMSxvdT1jcmxkcCxvdT1wa2ksbz1rc2lnbixjPWtyP2NlcnRpZmljYXRlUmV2b2NhdGlvbkxpc3QwDQYJKoZIhvcNAQEFBQADggEBALg0SjFXhqvCnG/oJm+YsGlCWg2+YPvvJBljIvbtqhvyhHDuzL+t9XwrCjnbur2RR0y1OAULq2LL37JUDtQ1XWPUvvTJQ6c7ZzNxDfiAlwiyEiZKGjpwO6epoq7emWxR4p6VoNR8FCStRIVsgXst2sX6nEin6+Wqt8t5nWZfFp0U2qBcRLpJINM8TQ4qa0APmgYorq98LmIgO+QfjaZsGng3xYnlRCBzEd03y9L7As8nHDx5/jGsomrwcCEfRFUMimxdhMp/L3+YmNjLFN47Rqur4PFLKnb5nRdRtT5gPz3DHf8DSSrFZp9MOoVvJGdmTW+izfS/X5Ea+waWABBCiro=",
		vid: Vid,
        success: function(output) {
        	form.envelop_data.value = output;
        	form.submit();
        },
        error: function(c, msg) {
            alert(c + ": " + msg);
        }
    });
}

function EnvKeyEncData(form){
	var plainData = form.id.value + "&" + form.pwd.value;
	var algorithm = "SEED";
	var KeyIV;
	
	// 대칭키 생성
    kcaseagt.generateSymKeyIv({
        algorithm: algorithm,
        success: function(key, iv) {
        	// 키 저장
        	KeyIV = key + "&" + iv;
        	alert(KeyIV);
        	// 대칭키로 암호화
            kcaseagt.blockCipher({
                mode: kcaseagt.mode.encrypt,
                algorithm: algorithm,
                key: key,
                iv: iv,
                input: plainData,
                success: function(output) {
                	form.encrypt_data.value = output;
                	
                	// 대칭키를 암호화
                    kcaseagt.genEnvelopedData({
                        algorithm: algorithm,
                        peerCert: "MIID6DCCAtCgAwIBAgICBSYwDQYJKoZIhvcNAQEFBQAwOjELMAkGA1UEBhMCa3IxDjAMBgNVBAoMBWtzaWduMQwwCgYDVQQLDANwa2kxDTALBgNVBAMMBHJvb3QwHhcNMDkwMzEyMDcyNzAwWhcNMjkwMzEyMDcyNjU5WjA5MQswCQYDVQQGEwJrcjEOMAwGA1UECgwFa3NpZ24xDDAKBgNVBAsMA3BraTEMMAoGA1UEAwwDc3NvMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALu/R0lBXpXE71fd2fCQbcG97+VuoYFE5m/z3v3GTHTT4ZO3bJX1fKtl4LbzexPV7u4NaWpEkCnHSMlvWeBWhO8CAwEAAaOCAb8wggG7ME8GCCsGAQUFBwEBBEMwQTA/BggrBgEFBQcwAoYzbGRhcDovLzEwLjEwLjExLjEwNjozODkvY249cm9vdCxvdT1wa2ksbz1rc2lnbixjPWtyMGMGA1UdIwRcMFqAFO9Anr0B41pyCs/ntcapvmUisQYAoT6kPDA6MQswCQYDVQQGEwJrcjEOMAwGA1UECgwFa3NpZ24xDDAKBgNVBAsMA3BraTENMAsGA1UEAwwEcm9vdIICA7YwHQYDVR0OBBYEFC6VYaINlaHGo8e1K9cgjJf+rOylMA4GA1UdDwEB/wQEAwIGwDBBBgNVHSABAf8ENzA1MDMGBCoDBAYwKzApBggrBgEFBQcCARYdaHR0cDovL3d3dy5rc2lnbi5jb20vY3BzLmh0bWwwJgYDVR0SBB8wHaAbBgkqgxqMmkQKAQGgDjAMDAoo7KO8KUtTaWduMGkGA1UdHwRiMGAwXqBcoFqGWGxkYXA6Ly8xMC4xMC4xMS4xMDY6Mzg5L2NuPWNkcDZwMSxvdT1jcmxkcCxvdT1wa2ksbz1rc2lnbixjPWtyP2NlcnRpZmljYXRlUmV2b2NhdGlvbkxpc3QwDQYJKoZIhvcNAQEFBQADggEBALg0SjFXhqvCnG/oJm+YsGlCWg2+YPvvJBljIvbtqhvyhHDuzL+t9XwrCjnbur2RR0y1OAULq2LL37JUDtQ1XWPUvvTJQ6c7ZzNxDfiAlwiyEiZKGjpwO6epoq7emWxR4p6VoNR8FCStRIVsgXst2sX6nEin6+Wqt8t5nWZfFp0U2qBcRLpJINM8TQ4qa0APmgYorq98LmIgO+QfjaZsGng3xYnlRCBzEd03y9L7As8nHDx5/jGsomrwcCEfRFUMimxdhMp/L3+YmNjLFN47Rqur4PFLKnb5nRdRtT5gPz3DHf8DSSrFZp9MOoVvJGdmTW+izfS/X5Ea+waWABBCiro=",
                        input: KeyIV,
                        success: function(output) {
                        	form.envelop_data.value = output;
                        	form.submit();
                        },
                        error: function (c, msg) {
                        	alert(c + ": "+ msg);
                        }
                    });
                },
                error: function (c, msg) {
                	alert(c + ": "+ msg);
                }
            });
        },
        error: function(c, msg) {
        	alert(c + ": "+ msg);
        }
    });
}

function GenKey(){
	var algorithm = "SEED";

	// 대칭키 생성
    kcaseagt.generateSymKeyIv({
        algorithm: algorithm,
        success: function(key, iv) {
        	alert(key);
        	alert(iv);
        },

        error: function(c, msg) {
        	alert(c + ": "+ msg);
        }
    });
}