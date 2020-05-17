const socket = io.connect("http://localhost:3000");
const message = document.getElementById("message"),
    output = document.getElementById("output"),
    button = document.getElementById("button"),
    feedback = document.getElementById("feedback"),
    name = document.getElementById("dropdownMenuButton"),
    alert = document.getElementById("alert"),
    chat_window = document.getElementById("chat-window");

button.addEventListener("click", () => {
    let data = {
        handle: name.textContent,
        message: message.value,
        date: new Date(),
    };
    message.value = "";
    socket.emit("chat", data);
    output.innerHTML +=
        "<div style='display:flex;justify-content:flex-end'><div class='bg-secondary mess p-2 mr-1 m-2 rounded col-8 '><h6 class='text-warning text-capitalize'>" +
        data.handle +
        " </h6><h5> " +
        data.message +
        "</h5><div style='text-align:right'>" +
        new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "numeric",
        }).format(new Date(data.date)) +
        "</div></div></div>";
    scroll();
    message.focus();
});
message.addEventListener("keypress", () => {
    socket.emit("typing", name.textContent);
});
socket.on("connect", () => {
    socket.emit("newconnection", name.textContent);
});
socket.on("newconnection", (data) => {
    alert.innerHTML =
        "<div class='alert alert-success' role='alert'>" +
        data +
        " joined the chat" +
        "</div>";
    window.setTimeout(function () {
        $(".alert")
            .fadeTo(500, 0)
            .slideUp(500, function () {
                $(this).remove();
            });
    }, 2000);
});
socket.on("chat", (data) => {
    feedback.innerHTML = "";
    output.innerHTML +=
        "<div style='display:flex;justify-content:flex-start'><div class='bg-dark mess p-2 ml-1 m-2 rounded col-8 '><h6 class='text-success text-capitalize'>" +
        data.handle +
        " </h6><h5> " +
        data.message +
        "</h5><div style='text-align:right'>" +
        new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "numeric",
        }).format(new Date(data.date)) +
        "</div></div></div>";

    scroll();
    message.focus();
});
socket.on("typing", (data) => {
    feedback.innerHTML =
        "<p class='badge badge-success'><em>" +
        data +
        " is typing .... </em></p>";
    scroll();
});
const scroll = () => {
    chat_window.scrollTop = chat_window.scrollHeight;
};