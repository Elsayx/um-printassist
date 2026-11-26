"""Regenerate the original, synthetic documents in public/samples.

Optional development tools: Python 3, ReportLab and Pillow.
The app ships the completed fixtures; no Python dependencies are needed to run it.
"""
from pathlib import Path

from PIL import Image, ImageDraw
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, A3, letter
from reportlab.pdfgen.canvas import Canvas

OUT = Path(__file__).resolve().parents[1] / "public" / "samples"
OUT.mkdir(parents=True, exist_ok=True)
INK = "#142B49"
BLUE = "#214EB3"
MIST = "#D7E3FF"
GROUND = "#F6F4EB"
PALE = "#FCFAF4"
WHITE = "#FFFFFF"


def fill(c, color):
    c.setFillColor(colors.HexColor(color))


def stroke(c, color):
    c.setStrokeColor(colors.HexColor(color))


def rect(c, x, y, w, h, color):
    fill(c, color)
    c.rect(x, y, w, h, fill=1, stroke=0)


def poly(c, points, color, outline=None):
    path = c.beginPath()
    path.moveTo(*points[0])
    for pt in points[1:]:
        path.lineTo(*pt)
    path.close()
    fill(c, color)
    if outline:
        stroke(c, outline)
    c.drawPath(path, fill=1, stroke=bool(outline))


def label(c, text, x, y, size, font="Helvetica", color=INK):
    fill(c, color)
    c.setFont(font, size)
    c.drawString(x, y, text)


def line(c, x, y, x2, y2, color=INK, weight=1):
    stroke(c, color)
    c.setLineWidth(weight)
    c.line(x, y, x2, y2)


def arcade(c, x, y, w, h, variant=0):
    """An original axonometric study of an open-sided campus walkway."""
    c.saveState()
    c.translate(x, y)
    c.scale(w / 500, h / 305)
    rect(c, 0, 0, 500, 305, "#DAE4FC")
    for i in range(0, 501, 25):
        line(c, i, 0, i, 305, "#CBD8F5", .5)
    for j in range(0, 306, 25):
        line(c, 0, j, 500, j, "#CBD8F5", .5)
    # Isometric projections. The stairs and walkway share a common grid.
    def iso(a, b, z=0):
        return (49 + a * 1.05 + b * .71, 39 + a * .22 + b * .55 + z)
    def face(vertices, color, border=BLUE):
        c.setLineWidth(.65)
        poly(c, [iso(*point) for point in vertices], color, border)
    def seg(a, b, color=BLUE, weight=.55):
        line(c, *iso(*a), *iso(*b), color, weight)
    def cuboid(a, b, width, depth, height, base=0):
        X, Y = a + width, b + depth
        Z = base + height
        face([(a,b,base),(X,b,base),(X,b,Z),(a,b,Z)], "#597BD0")
        face([(X,b,base),(X,Y,base),(X,Y,Z),(X,b,Z)], "#3059B3")
        face([(a,b,Z),(X,b,Z),(X,Y,Z),(a,Y,Z)], "#F0F3FE")
    face([(-8,-7,0),(302,-7,0),(329,48,0),(17,48,0)], "#B7C8EB", None)
    for n in range(5):
        cuboid(2, -45 + n * 8, 277, 10, 2 + n * 2)
    cuboid(-3, -6, 287, 108, 12)
    for k in range(7):
        cuboid(k * 43, 73, 7, 17, 104, 12)
    for k in range(7):
        cuboid(k * 43, 0, 11, 14, 104, 12)
    # The facade has six arched openings. Cubic curves stay in the same plane
    # as the column drawing and the oblique roof.
    for k in range(6):
        a = k * 43 + 10
        b = (k + 1) * 43 + 1
        p = c.beginPath()
        p.moveTo(*iso(a, 0, 116))
        p.lineTo(*iso(b, 0, 116))
        p.lineTo(*iso(b, 0, 66))
        p.curveTo(*iso(b, 0, 107), *iso(a, 0, 107), *iso(a, 0, 66))
        p.close()
        fill(c, "#597BD0")
        stroke(c, BLUE)
        c.drawPath(p, fill=1, stroke=1)
    cuboid(-9, -6, 288, 117, 6, 116)
    for a in range(1, 280, 12):
        seg((a,-5,122), (a,109,122), "#8CA3D7", .45)
    for b in [12,40,68,96]:
        seg((-9,b,122), (279,b,122), "#8CA3D7", .4)
    if variant % 2:
        for a in [10, 90, 182, 263]:
            seg((a,-42,1), (a,-34,3), "#849BC8", .5)
    c.restoreState()


def diagram(c, x, y, w, h, number):
    if number % 4 == 1:
        arcade(c, x, y, w, h, number)
        return "Section through a covered walkway"
    c.saveState()
    c.translate(x, y)
    c.scale(w/500, h/305)
    rect(c, 0, 0, 500, 305, "#E3EAF9")
    for i in range(0, 501, 25):
        line(c, i, 0, i, 305, "#D1DDF2", .5)
    for j in range(0, 306, 25):
        line(c, 0, j, 500, j, "#D1DDF2", .5)
    if number % 4 == 2:
        caption = "Plan showing approach and crossing points"
        for bx,by,bw,bh in [(37,39,130,75),(37,157,96,111),(182,174,114,87),(356,168,104,93),(284,37,176,71)]:
            rect(c,bx+6,by-6,bw,bh,"#B7C8E9")
            rect(c,bx,by,bw,bh,"#6587CE")
            for xx in range(bx+7,bx+bw-5,11):
                line(c,xx,by+3,xx,by+bh-3,"#9DB4E1",.6)
        stroke(c,BLUE); c.setLineWidth(3); c.setDash([6,4],0)
        path=c.beginPath(); path.moveTo(5,132); path.lineTo(207,132); path.lineTo(245,148); path.lineTo(321,148); path.lineTo(321,297)
        c.drawPath(path)
        c.setDash([],0)
        for px,py in [(207,132),(321,148)]:
            fill(c,PALE); c.circle(px,py,5,stroke=1,fill=1)
    elif number % 4 == 3:
        caption = "Section detail showing level changes"
        path=[(47,50),(47,71)]
        for j in range(10):
            px,py=47+j*39,71+j*14
            path.extend([(px+39,py),(px+39,py+14)])
        path.extend([(466,211),(466,50)])
        poly(c,path,"#7292D2",BLUE)
        for j in range(10):
            px,py=47+j*39,71+j*14
            line(c,px,py,px+39,py,BLUE,2)
        for j in range(0,11,2):
            xx,yy=47+j*39,71+j*14
            line(c,xx,yy,xx,yy+44,BLUE,1.5)
        line(c,47,115,437,255,BLUE,2)
        line(c,25,49,475,49,BLUE,1)
    else:
        caption = "Study of changing light and shade"
        for j in range(6):
            bx=50+j*62; by=58+j*8
            poly(c,[(bx,by),(bx+22,by),(bx+90,by+34),(bx+69,by+34)],"#C1CFEA")
            rect(c,bx,by,21,122,"#6485CB")
            poly(c,[(bx+21,by),(bx+32,by+8),(bx+32,by+130),(bx+21,by+122)],"#335AAE")
        poly(c,[(39,169),(408,217),(458,244),(90,196)],"#F0F3FC",BLUE)
        poly(c,[(39,169),(408,217),(408,207),(39,159)],"#6F8EC8",BLUE)
        stroke(c,BLUE); c.setLineWidth(.9)
        c.arc(44,92,258,287,15,140)
        fill(c,PALE); c.circle(167,285,10,stroke=1,fill=1)
    c.restoreState()
    return caption


def file(name, title, size=A4):
    c = Canvas(str(OUT / name), pagesize=size, invariant=1, pageCompression=1)
    c.setTitle(title)
    c.setAuthor("PrintAssist sample library")
    c.setSubject("Original synthetic document for print preview")
    return c


def paper(c, w, h, section, i, total):
    rect(c, 0, 0, w, h, PALE)
    label(c, "DESIGN   /   STUDIES", 41, h-44, 11, "Helvetica-Bold", BLUE)
    c.setFont("Helvetica", 10)
    c.drawRightString(w-41, h-44, section)
    line(c, 41, h-57, w-41, h-57, BLUE, .8)
    line(c, 41, 55, w-41, 55, BLUE, .8)
    label(c, "CAMPUS DESIGN STUDIO", 41, 35, 9, "Helvetica-Bold", BLUE)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(w-41, 34, f"{i:02}   /   {total:02}")


def topic_page(c, size, category, name, number, total, description):
    w, h = size
    c.setPageSize(size)
    paper(c, w, h, category, number, total)
    label(c, f"STUDY   {number:02}", 41, h-106, 13, "Helvetica-Bold", BLUE)
    label(c, name, 39, h-161, min(44, (w-86) / (len(name) * .49)), "Times-Bold")
    lines = description.split("|")
    for j, value in enumerate(lines):
        label(c, value, 42, h-204-j*20, 14)
    image_top = h - 260
    image_height = min(h * .36, image_top - 113)
    caption = diagram(c, 42, image_top-image_height, w-84, image_height, number)
    label(c, "FIGURE", 42, image_top-image_height-24, 9, "Helvetica-Bold", BLUE)
    label(c, f"{number:02}   /   {caption}", 91, image_top-image_height-24, 11)
    c.showPage()


def write_handout():
    c = file("lecture_handout_12p.pdf", "Field Notes on Campus Design")
    w, h = A4
    paper(c, w, h, "FIELD GUIDE   /   VOL. 01", 1, 12)
    label(c, "FIELD GUIDE   01", 42, h-106, 14, "Helvetica-Bold", BLUE)
    label(c, "Field Notes on", 38, h-179, 61, "Times-Bold")
    label(c, "Campus Design", 38, h-241, 61, "Times-Bold")
    label(c, "An illustrated guide to reading everyday spaces", 41, h-280, 18)
    arcade(c, 41, 171, w-82, 315)
    label(c, "PLATE   01", 41, 144, 10, "Helvetica-Bold", BLUE)
    label(c, "The covered walkway", 117, 143, 15, "Times-Italic")
    c.showPage()
    topics = [
        ("Arriving on foot", "Trace a short route from an entrance to an everyday destination."),
        ("Thresholds", "Notice how a change in floor level signals the start of a new space."),
        ("Shade and shelter", "Follow the edge of afternoon shade along the covered path."),
        ("Reading a sign", "Look for a decision point where a sign is visible before a turn."),
        ("Lines of sight", "Compare what can be seen from a doorway and from a corridor."),
        ("Shared tables", "Sketch how a table supports both individual and group work."),
        ("Quiet corners", "Compare places to pause beside a busy pedestrian route."),
        ("Crossing paths", "Map where movement passes through a shared entrance."),
        ("Edges and surfaces", "Record one material change and the action it invites."),
        ("Space over time", "Consider how the use of a courtyard changes during the day."),
        ("Observation notes", "Choose one detail and explain how it shapes a campus journey."),
    ]
    for i, (name, blurb) in enumerate(topics, 2):
        topic_page(c, A4, "FIELD GUIDE   /   VOL. 01", name, i, 12, blurb)
    c.save()


def write_slides():
    size = (768, 432)
    c = file("slides_16x9.pdf", "Wayfinding in shared spaces", size)
    for i, title in enumerate(["Wayfinding in shared spaces", "Landmarks", "Decision points", "Approaching a doorway"], 1):
        w,h=size
        rect(c,0,0,w,h,PALE)
        label(c,"DESIGN   /   LECTURE SERIES",31,h-42,13,"Helvetica-Bold",BLUE)
        line(c,31,h-55,w-31,h-55,BLUE)
        label(c,title,29,h-115,39,"Times-Bold")
        diagram(c, 32, 72, 396, 200, i)
        label(c, f"{i:02} / 04", w-82, 33, 13, "Helvetica-Bold", BLUE)
        c.showPage()
    c.save()


def others():
    for name, title, pages in [
        ("group_report.pdf","Courtyard study",[A4] * 3),
        ("lecture_notes.pdf","Lecture notes",[A4] * 2),
        ("mixed_sizes.pdf","Scale study",[A4,(A3[1], A3[0]),letter]),
    ]:
        c = file(name,title)
        for i, size in enumerate(pages,1):
            topic_page(c,size,"STUDIO NOTEBOOK",title,i,len(pages),"A synthetic study page for checking scale, placement and page order.")
        c.save()


def image():
    img = Image.new("RGB",(1100,740),"#E4EBFB")
    d = ImageDraw.Draw(img)
    for i in range(0,1100,37):
        d.line((i,0,i,740), fill="#D2DDF5")
    for j in range(0,740,37):
        d.line((0,j,1100,j), fill="#D2DDF5")
    for k in range(12):
        x, y = 150+k*49,500-k*21
        d.polygon([(x,y),(x+170,y+60),(x+284,y-4),(x+114,y-64)],fill="#A9BEE9",outline=BLUE,width=2)
        d.polygon([(x,y),(x+170,y+60),(x+170,y+82),(x,y+22)],fill="#496BB7",outline=BLUE,width=2)
        d.polygon([(x+170,y+60),(x+284,y-4),(x+284,y+18),(x+170,y+82)],fill="#3056A3",outline=BLUE,width=2)
    img.save(OUT/"sample_image.png", optimize=True)


if __name__ == "__main__":
    write_handout()
    write_slides()
    others()
    image()
    (OUT / "malformed.pdf").write_bytes(b"%PDF-1.7\nSynthetic broken fixture: no page objects or trailer.\n")
