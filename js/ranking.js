Papa.parse("csv/ranking_2026.csv", {

    download: true,

    header: true,

    complete: function(results) {

        const table = document.getElementById("ranking");
        const thead = table.querySelector("thead");
        const tbody = table.querySelector("tbody");

        // Header
        const headerRow = document.createElement("tr");

        Object.keys(results.data[0]).forEach(col => {

            const th = document.createElement("th");
            th.textContent = col;
            headerRow.appendChild(th);

        });

        thead.appendChild(headerRow);

        // Rows
        results.data.forEach(player => {

            const tr = document.createElement("tr");

            Object.values(player).forEach(value => {

                const td = document.createElement("td");
                td.textContent = value;
                tr.appendChild(td);

            });

            tbody.appendChild(tr);

        });

    }

});