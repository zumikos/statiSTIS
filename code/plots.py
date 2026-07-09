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
        xaxis_title="STR",
        yaxis_title="Počet hráčů"
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

    fig = px.line(
        counts,
        x="Sezóna",
        y="Počet hráčů",
        markers=True
    )

    fig.update_layout(
        hovermode="x unified",
        xaxis_title="Sezóna",
        yaxis_title="Počet hráčů"
    )

    fig.write_html(
        output_dir / "player_count.html",
        include_plotlyjs="cdn"
    )

    print("✓ Uložen graf počtu hráčů.")