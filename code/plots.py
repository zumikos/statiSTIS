import plotly.express as px
import numpy as np
import json


def remove_trailing_whitespace(file_path):
    content = file_path.read_text(encoding="utf-8")
    cleaned = "\n".join(line.rstrip() for line in content.splitlines()) + "\n"
    file_path.write_text(cleaned, encoding="utf-8")

def plot_histogram(master, output_dir):

    season = master["Sezóna"].max()

    ratings = master.loc[
        master["Sezóna"] == season,
        "STR"
    ]

    bin_edges = np.arange(0, 2201, 100)
    player_counts, _ = np.histogram(ratings, bins=bin_edges)
    histogram_data = [
        {"start": int(bin_edges[index]), "end": int(bin_edges[index + 1]), "count": int(count)}
        for index, count in enumerate(player_counts)
    ]
    output_file = output_dir / f"histogram_STR_{season}.html"
    html = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;width:100%;height:100%;font-family:Arial,sans-serif;background:white}
svg{display:block;width:100%;height:100%}
.grid{stroke:#ddd;stroke-width:1}.frame{fill:none;stroke:#000;stroke-width:1}
.bar{fill:#1976d2;stroke:#0d47a1;stroke-width:1}.hover-zone{fill:transparent;pointer-events:all}
.hover-zone:hover{fill:rgba(100,181,246,.28)}.axis-label{fill:#222;font-size:16px}
.tooltip{visibility:hidden;pointer-events:none}.tooltip rect{fill:#0d47a1;stroke:white;rx:5}
.tooltip text{fill:white;font-size:16px;font-weight:bold}
</style>
</head>
<body>
<svg id="chart" viewBox="0 0 600 440" role="img" aria-label="Histogram STR"></svg>
<script>
const data=__DATA__;
const svg=document.getElementById('chart');
const ns='http://www.w3.org/2000/svg';
const width=600,height=440,margin={top:20,right:15,bottom:65,left:75};
const plotWidth=width-margin.left-margin.right,plotHeight=height-margin.top-margin.bottom;
const yMax=Math.ceil(Math.max(...data.map(item=>item.count))/500)*500;
const element=(name,attributes={})=>{const node=document.createElementNS(ns,name);Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));return node};
const x=value=>margin.left+(value/2200)*plotWidth;
const y=value=>margin.top+((yMax-value)/yMax)*plotHeight;
for(let value=0;value<=yMax;value+=500){const lineY=y(value);svg.appendChild(element('line',{x1:margin.left,y1:lineY,x2:width-margin.right,y2:lineY,class:'grid'}));const label=element('text',{x:margin.left-10,y:lineY+5,'text-anchor':'end',class:'axis-label'});label.textContent=value.toLocaleString('cs-CZ');svg.appendChild(label)}
const xTicks=[0,200,400,600,800,1000,1200,1400,1600,1800,2000,2200];
xTicks.forEach(value=>{const lineX=x(value);svg.appendChild(element('line',{x1:lineX,y1:margin.top,x2:lineX,y2:height-margin.bottom,class:'grid'}));const label=element('text',{x:lineX,y:height-margin.bottom+25,'text-anchor':'middle',class:'axis-label'});label.textContent=value.toLocaleString('cs-CZ');svg.appendChild(label)});
data.forEach(item=>{const left=x(item.start),right=x(item.end);svg.appendChild(element('rect',{x:left+1,y:y(item.count),width:Math.max(1,right-left-2),height:height-margin.bottom-y(item.count),class:'bar'}))});
svg.appendChild(element('rect',{x:margin.left,y:margin.top,width:plotWidth,height:plotHeight,class:'frame'}));
const tooltip=element('g',{class:'tooltip'}),tooltipBox=element('rect',{width:190,height:48}),tooltipText1=element('text',{x:10,y:19}),tooltipText2=element('text',{x:10,y:39});tooltip.append(tooltipBox,tooltipText1,tooltipText2);svg.appendChild(tooltip);
data.forEach(item=>{const left=x(item.start),right=x(item.end),zone=element('rect',{x:left,y:margin.top,width:right-left,height:plotHeight,class:'hover-zone',tabindex:0});const show=()=>{const tooltipX=Math.min(Math.max((left+right)/2-95,margin.left),width-margin.right-190);tooltip.setAttribute('transform',`translate(${tooltipX} ${margin.top+8})`);tooltipText1.textContent=`STR: ${item.start}–${item.end}`;tooltipText2.textContent=`Počet hráčů: ${item.count.toLocaleString('cs-CZ')}`;tooltip.style.visibility='visible'};const hide=()=>tooltip.style.visibility='hidden';zone.addEventListener('mouseenter',show);zone.addEventListener('mouseleave',hide);zone.addEventListener('focus',show);zone.addEventListener('blur',hide);svg.appendChild(zone)});
svg.appendChild(tooltip);
const xTitle=element('text',{x:margin.left+plotWidth/2,y:height-10,'text-anchor':'middle',class:'axis-label'});xTitle.textContent='STR';svg.appendChild(xTitle);
const yTitle=element('text',{x:18,y:margin.top+plotHeight/2,'text-anchor':'middle',transform:`rotate(-90 18 ${margin.top+plotHeight/2})`,class:'axis-label'});yTitle.textContent='Počet hráčů';svg.appendChild(yTitle);
</script>
</body>
</html>
""".replace("__DATA__", json.dumps(histogram_data, ensure_ascii=False))
    output_file.write_text(html, encoding="utf-8")
    remove_trailing_whitespace(output_file)
    print("✓ Uložen histogram STR.")
    
    
def plot_player_count(master, output_dir):

    counts = (
        master
        .groupby("Sezóna")
        .size()
        .reset_index(name="Počet hráčů")
    )

    counts["Sezóna"] = counts["Sezóna"].apply(
        lambda y: f"{y-1}/{str(y)[2:]}" + ("*" if y == 2021 else "")
    )

    fig = px.line(
        counts,
        x="Sezóna",
        y="Počet hráčů",
        markers=True,
        template="simple_white",
    )

    fig.update_traces(
        line=dict(color="#1976d2", width=4),
        marker=dict(color="#ffffff", line=dict(color="#1976d2", width=3), size=9),
        hovertemplate="%{y:,d}<extra></extra>",
    )

    fig.update_layout(
        hovermode="x unified",
        xaxis=dict(
            tickmode="linear",
            dtick=1,
            tickangle=-45,
            showgrid=True,
            gridcolor="#dddddd",
            fixedrange=True,
            showline=True,
            linecolor="#000000",
            linewidth=1,
            mirror=True,
        ),
        yaxis=dict(
            range=[8000, 20000],
            dtick=2000,
            tickformat=",",
            showgrid=True,
            gridcolor="#dddddd",
            fixedrange=True,
            showline=True,
            linecolor="#000000",
            linewidth=1,
            mirror=True,
        ),
        separators=", ",
        hoverlabel=dict(
            bgcolor="#0d47a1",
            bordercolor="#ffffff",
            font_color="#ffffff",
            font_family="Arial",
        ),
        font_family="Arial",
        dragmode=False,
        margin=dict(t=30, r=20, b=90, l=70),
        annotations=[
            dict(
                x=0,
                y=-0.32,
                xref="paper",
                yref="paper",
                text="* covid",
                showarrow=False,
                xanchor="left",
            )
        ],
    )  

    fig.update_yaxes(
        tickformat=",d",
        separatethousands=True
    )

    output_file = output_dir / "player_count.html"
    fig.write_html(
        output_file,
        include_plotlyjs="cdn",
        full_html=True,
        config={"responsive": True, "displayModeBar": False, "scrollZoom": False, "doubleClick": False},
    )
    remove_trailing_whitespace(output_file)

    print("✓ Uložen graf počtu hráčů.")
