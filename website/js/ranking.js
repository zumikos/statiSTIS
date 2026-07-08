fetch("csv/ranking_2026.csv")

.then(response => response.text())

.then(text => {

const rows = text.trim().split("\n");

const table = document.getElementById("ranking");

const thead = table.querySelector("thead");

const tbody = table.querySelector("tbody");

rows.forEach((row,index)=>{

const cols=row.split(",");

const tr=document.createElement("tr");

cols.forEach(col=>{

const cell=document.createElement(
index==0 ? "th":"td"
);

cell.textContent=col;

tr.appendChild(cell);

});

if(index==0)
thead.appendChild(tr);

else
tbody.appendChild(tr);

});

});