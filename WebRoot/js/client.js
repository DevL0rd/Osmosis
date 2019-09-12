var Version = 0
//Force debug until you make UI to toggle it
var socket = io();
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
});


function spawnButton() {
    socket.emit("spawn");
    $("#closeMenu").trigger("click");
}