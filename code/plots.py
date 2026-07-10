import plotly.express as px

def plot_histogram(master, output_dir):

    season = master["Sezóna"].max()

    ratings = master.loc[
        master["Sezóna"] == season,
        "STR"
    ]

    fig = px.histogram(
        x=ratings,
        nbins=40
    )

    fig.update_layout(
        xaxis=dict(
            tickmode="linear",
            dtick=1,
            tickangle=-45,
            title="STR"
        ),
        yaxis_title="Počet hráčů",
        separators=", ",
    )

    fig.update_xaxes(
        dtick=200
    )

    fig.update_yaxes(
        tickformat=",d" ,
        separatethousands=True
    )

    fig.write_html(output_dir / f"histogram_STR_{season}.html")
    
    print("✓ Uložen histogram STR.")
    
    
def plot_player_count(master, output_dir):

    counts = (
        master
        .groupby("Sezóna")
        .size()
        .reset_index(name="Počet hráčů")
    )

    counts["Popisek"] = counts["Sezóna"].apply(
        lambda y: f"{y-1}/{str(y)[2:]}"
    )

    fig = px.line(
        counts,
        x="Popisek",
        y="Počet hráčů",
        markers=True
    )

    fig.update_layout(
        hovermode="x unified",
        xaxis=dict(
            tickmode="linear",
            dtick=1,
            tickangle=-45,
        ),
        yaxis=dict(
            tickformat=","
        ),
        separators=", ",
    )  

    fig.update_yaxes(
        tickformat=",d",
        separatethousands=True
    )

    fig.write_html(
        output_dir / "player_count.html",
        include_plotlyjs="cdn"
    )

    print("✓ Uložen graf počtu hráčů.")