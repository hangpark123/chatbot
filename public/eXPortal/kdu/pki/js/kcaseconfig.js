
/*************************************************************************************
아카넷 수정 : 경로설정
*************************************************************************************/

//var basePath = location.protocol + "//"+document.domain+"/pki/kcase";

var basePath = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "") + "/pki/kcase";

//agent 설치파일
var file = encodeURI(basePath + "/client/KCaseAgent_Installer_v1.3.8.exe");
// HTML5 UI 경로 ../kcase/lib 까지 잡아주셔야됩니다.
var libPath = basePath + "/lib";
