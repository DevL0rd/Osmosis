var Version = 0
//Force debug until you make UI to toggle it
var socket = io({ reconnection: true });
socket.on('forceRefresh', function () {
    window.location.reload();
});
socket.on('connect', function () {
    $("#chatLog").html("");
    socket.emit("updateUsers");
    if (localStorage.persistentLoginKey) {
        socket.emit('autologin', {
            email: localStorage.email,
            persistentLoginKey: localStorage.persistentLoginKey
        });

    }
    $("#loginLink").trigger("click");
    socket.emit("getSkins");
});
socket.on("playerDied", function () {
    console.log("You died!")
    $("#guest_button").trigger("click");
});
socket.on("getSkins", function (skinUrls) {
    //populate list
    $("#skinList").html("");
    for (i in skinUrls) {
        var skinUrl = skinUrls[i];
        var elem = $("#skin0").clone().appendTo("#skinList");
        $(elem).attr("id", "");
        $(elem).find('.skinImage').attr("src", skinUrl);
        $(elem).find('.skinImage').click(selectedSkin);
        $(elem).show(400);
    }
});
var Themes = {};
socket.on("getThemes", function (newThemes) {
    //populate list
    Themes = newThemes;
    loadThemeData();
});

socket.on("getScoreboard", function (newScoreBoard) {
    scoreBoard = newScoreBoard;
    $("#scores").html("");
    for (i in scoreBoard) {
        var entry = scoreBoard[i];
        $("#scores").append("<span>" + entry.username + ": " + entry.score + "</span><br>");
    }
});

function getThemes() {
    socket.emit("getThemes", Themes);
}
getThemes();
function spawnButton() {
    socket.emit("spawn");
    $("#closeMenu").trigger("click");
}

function selectedSkin() {
    $("#mainMenuSkinImage").attr('src', this.src);
    socket.emit("setProfilePictureUrl", this.src);
}
$("#login").on('shown.bs.modal', function () {
    $("#content").addClass("blur");
});
// $("#login").on('hidden.bs.modal', function () {
//     $("#content").toggleClass("blur");
// });
$("#mainMenu").on('shown.bs.modal', function () {
    $("#content").addClass("blur");
});
$("#mainMenu").on('hidden.bs.modal', function () {
    $("#content").removeClass("blur");
});