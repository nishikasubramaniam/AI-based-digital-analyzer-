// Registration Function
function register() {

    let username = document.getElementById("newUser").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("newPass").value;

    localStorage.setItem("username", username);
    localStorage.setItem("password", password);

    alert("Registration Successful");
    window.location.href = "login.html";
}


// Login Function
function login() {

    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    let savedUser = localStorage.getItem("username");
    let savedPass = localStorage.getItem("password");

    if(username === savedUser && password === savedPass){
        alert("Login Successful");
        window.location.href = "dashboard.html";
    }
    else{
        document.getElementById("msg").innerHTML =
        "Invalid Username or Password";
    }
}


// Logout Function
function logout(){
    window.location.href = "login.html";
}


// CRUD Functions
function addData() {

    let name = document.getElementById("name").value;
    let department = document.getElementById("department").value;

    if(name === "" || department === ""){
        alert("Please fill all fields");
        return;
    }

    let table = document.getElementById("dataTable");

    let row = table.insertRow();

    row.insertCell(0).innerHTML = name;
    row.insertCell(1).innerHTML = department;

    row.insertCell(2).innerHTML =
    '<button onclick="editData(this)">Edit</button> ' +
    '<button onclick="deleteData(this)">Delete</button>';

    document.getElementById("name").value = "";
    document.getElementById("department").value = "";
}

function editData(btn){

    let row = btn.parentElement.parentElement;

    document.getElementById("name").value = row.cells[0].innerHTML;
    document.getElementById("department").value = row.cells[1].innerHTML;

    row.remove();
}

function deleteData(btn){

    let row = btn.parentElement.parentElement;
    row.remove();
}function searchData() {

    let input = document.getElementById("searchInput");
    let filter = input.value.toUpperCase();

    let table = document.getElementById("dataTable");
    let tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {

        let td = tr[i].getElementsByTagName("td")[0];

        if (td) {
            let txtValue = td.textContent || td.innerText;

            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}function addData() {

    let name = document.getElementById("name").value;
    let department = document.getElementById("department").value;

    if(name === "" || department === ""){
        alert("Please fill all fields");
        return;
    }

    let table = document.getElementById("dataTable");

    let row = table.insertRow();

    row.insertCell(0).innerHTML = name;
    row.insertCell(1).innerHTML = department;

    row.insertCell(2).innerHTML =
        '<button onclick="editData(this)">Edit</button> ' +
        '<button onclick="deleteData(this)">Delete</button>';

    document.getElementById("name").value = "";
    document.getElementById("department").value = "";
}

function editData(btn){

    let row = btn.parentElement.parentElement;

    document.getElementById("name").value = row.cells[0].innerHTML;
    document.getElementById("department").value = row.cells[1].innerHTML;

    row.remove();
}

function deleteData(btn){

    let row = btn.parentElement.parentElement;
    row.remove();
}

function searchData(){

    let input = document.getElementById("searchInput").value.toLowerCase();

    let table = document.getElementById("dataTable");
    let rows = table.getElementsByTagName("tr");

    for(let i = 1; i < rows.length; i++){

        let firstCell = rows[i].getElementsByTagName("td")[0];

        if(firstCell){

            let text = firstCell.textContent.toLowerCase();

            if(text.includes(input)){
                rows[i].style.display = "";
            }else{
                rows[i].style.display = "none";
            }
        }
    }
}
