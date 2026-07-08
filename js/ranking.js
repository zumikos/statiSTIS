Papa.parse("csv/ranking_2026.csv", {

    download: true,

    header: true,

    dynamicTyping: true,

    complete: function(results) {

        results.data = results.data.filter(
            row => row["ID"] !== undefined
        );

        let columns = [];

        Object.keys(results.data[0]).forEach(name => {

            columns.push({

                title: name,

                data: name

            });

        });

        new DataTable("#ranking", {

            data: results.data,

            columns: columns,

            pageLength: 25,

            order: [[0, "asc"]],

            searching: true,

            info: true,

            paging: true,

            scrollX: true

        });

    }

});