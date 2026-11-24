# Regenerate with Python 3 + reportlab and DejaVu TrueType fonts installed.
# Run from any directory; review rendered pages after changing content.
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

OUT=Path(__file__).resolve().parents[1] / 'public/downloads/mycoview-facilitator-packet.pdf'
for name,file in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Italic','DejaVuSans-Oblique.ttf'),('Display','DejaVuSerif.ttf')]:
 pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+file))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Italic',boldItalic='Bold')
INK='#193D32'; TEXT='#253C35'; MUTED='#52675E'; LINE='#C7D2CB'; PALE='#EEF3EF'; GOLD='#AB7128'
W,H=612,792; M=48; CW=516
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('Lead a Mushroom Walk | MycoView facilitator packet');c.setAuthor('MycoView');c.setSubject('Three flexible events and printable participant worksheets.')

def para(text,x,y,w=CW,size=10.5,font='Body',color=TEXT,leading=None):
 st=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.42,textColor=HexColor(color))
 p=Paragraph(text,st);_,h=p.wrap(w,700)
 assert y+h<(785 if y>=752 else 744),(text[:80],y,h)
 p.drawOn(c,x,H-y-h);return y+h
def line(y,x=M,w=CW):
 c.setStrokeColor(HexColor(LINE));c.setLineWidth(.65);c.line(x,H-y,x+w,H-y)
def box(x,y,w,h,fill=PALE):
 c.setFillColor(HexColor(fill));c.roundRect(x,H-y-h,w,h,8,stroke=0,fill=1)
def tag(text,y,x=M):return para(text.upper(),x,y, CW,8.4,'Bold',GOLD,12)
def begin(num,label,title,sub=None,key=None):
 c.setFillColor(HexColor(INK));c.rect(0,H-8,W,8,stroke=0,fill=1)
 para('MYCOVIEW',M,25,180,10,'Bold',INK)
 para('FACILITATOR PACKET  /  FIELD EDITION',330,26,234,7.7,'Bold',MUTED)
 line(48);tag(label,66)
 y=para(title,M,88,CW,26,'Display',INK,32)
 if sub:y=para(sub,M,y+12,CW,10.5,color=MUTED)
 if key:c.bookmarkPage(key);c.addOutlineEntry(title,key,0)
 line(752);para('MycoView  |  Curiosity, shared.',M,763,340,8,color=MUTED)
 para(f'{num:02d} / 09',510,763,54,8,'Bold',MUTED)
 return y+22
def end():c.showPage()
def section(title,text,y):
 y=para(title,M,y,CW,12,'Bold',INK);return para(text,M,y+5)+15
def check(text,y):
 c.setStrokeColor(HexColor(MUTED));c.rect(M,H-y-10,8,8,stroke=1,fill=0)
 return para(text,M+19,y,CW-19,10)+9
def promptbox(title,text,y):
 st=ParagraphStyle('measure',fontName='Body',fontSize=10.5,leading=15)
 p=Paragraph(text,st);_,h=p.wrap(CW-32,600)
 box(M,y,CW,h+52);tag(title,y+12,M+16)
 para(text,M+16,y+32,CW-32,10.5,leading=15);return y+h+66
def ruled(label,y,rows=2):
 tag(label,y);y+=28
 for _ in range(rows):line(y);y+=25
 return y+5
def url(label,path,y):
 u='https://mycoview.com'+path
 y=para(f'<link href="{u}" color="{INK}"><b>{label}</b></link>',M,y,CW,10)
 return para('mycoview.com'+path,M,y+2,CW,8.5,color=MUTED)+10

# 1: useful cover / contents
y=begin(1,'A field guide for facilitators','Lead a mushroom walk.', 'Three flexible events for clubs, friends, families and curious naturalists.',key='start')
y=para('Notice more.<br/>Make a useful record.<br/>Follow a question together.',M,y+8,CW,23,'Display',INK,32)+24
y=para('You do not need to turn every walk into a research project. Start with the kind of experience your group wants, and let people choose how far to follow their curiosity.',M,y,CW,11)+24
for n,title,desc,pages,key in [('01','First walk','Notice before naming. Leave with one detail and a reason to return.','3-4','event1'),('02','Observation skills','Make a record that someone who was not there can understand.','5-6','event2'),('03','Collaborative question','Turn a shared question into a modest repeat-visit plan.','7-8','event3')]:
 box(M,y,CW,77);para(n,M+14,y+14,40,20,'Display',GOLD)
 para(f'<link href="#{key}">{title}</link>',M+65,y+11,350,13,'Bold',INK)
 para(desc,M+65,y+33,370,9.5);para(pages,520,y+15,35,9,'Bold',MUTED);y+=89
y=para('<b>Start here:</b> preparation on page 2. Each event has a facilitator plan and a separate worksheet. Follow-up messages and resource links are on page 9.',M,y+3,CW,10)+14
para('Version 1.0  |  November 24, 2026<br/>Adapted from MycoView activities. Not yet field-tested.',M,y,CW,8.5,color=MUTED)
end()

# 2
y=begin(2,'Before you go','Make room for everyone.', 'Pick one event. Bring one or two activities. Leave room for surprises.',key='prepare')
for t in ['Confirm permission to visit and the site\'s collecting rules. These events can run without collecting or tasting.', 'Share the meeting point, duration, route length, surface, grade, obstacles, seating, facilities and weather plan.', 'Offer a stationary option. Do not call a route accessible without checking its actual conditions.', 'Bring printed prompts, pencils, spare paper, a firm writing surface and a timer. Phones and cameras are optional.', 'Prepare your own or permission-cleared photographs for an indoor or no-fruiting alternative.']:
 y=check(t,y)
y=promptbox('Read aloud', '“Today is about noticing and comparing what we see. You do not need to know names, own equipment or post anything online. You can describe, sketch, photograph, listen or ask questions. Sharing is optional.”',y+5)
y=section('Offer roles, not levels','Try observer, recorder, photographer and questioner. Rotate roles if people want to. An experienced member can ask a helpful question instead of naming every find. Nobody must kneel, touch a specimen, use a phone or speak to the whole group.',y)
y=section('Keep observation separate from explanation','Ask: “What did we see?” before “What do we think it means?” Unknown is an acceptable entry. A nearby tree is habitat context; proximity alone does not establish a fungal host relationship.',y)
para('<b>Print only what you need.</b> Pages 4, 6 and 8 are participant worksheets. Print one per person or pair, single-sided on US Letter. The plans work without an internet connection; follow resource links before or after the event.',M,y,CW,10)
end()

def event(num,idx,title,sub,materials,takeaway,agenda,short,prompts,fallback,key):
 y=begin(num,f'Event {idx} / facilitator plan',title,sub,key=key)
 y=para('<b>Use:</b> '+materials,M,y,CW,9.5)+7
 y=para('<b>Take home:</b> '+takeaway,M,y,CW,9.5)+18
 for time,heading,text in agenda:
  line(y);para(time,M,y+10,69,10,'Bold',GOLD)
  z=para(heading,M+83,y+8,CW-83,10.5,'Bold',INK)
  z=para(text,M+83,z+3,CW-83,9.5,leading=13);y=max(y+43,z+7)
 y=para('<b>Short version:</b> '+short,M,y+8,CW,9.5)+16
 y=promptbox('Questions to keep handy',prompts,y)
 y=section('If no mushrooms are visible',fallback,y)
 return y

y=event(3,'01','Notice before naming.','A first walk  |  60 minutes  |  Short option: 30 minutes', 'The Alien Naturalist; The One-Square-Meter Universe.','Three observed details, one question and a return intention.',[
('0-10 min','Welcome and settle in','Explain boundaries and participation choices. Compare one observation with one interpretation.'),
('10-20 min','Describe an unfamiliar world','Describe a find without “mushroom,” “cap,” “stem” or “gills.” A partner locates the features described.'),
('20-40 min','Explore together','Pairs or small groups choose one thing to notice carefully within the agreed area.'),
('40-50 min','Compare what you noticed','What did someone else see that you missed? Reveal the activity\'s science after trying it.'),
('50-60 min','Choose what to carry forward','Use page 4. Invite a question and possible return visit; allow people to pass.')],
'5 minutes welcome + 10 description + 10 exploration + 5 takeaway.',
'What can you describe without naming it?<br/>Which part did you actually see?<br/>What would you look for next time?',
'Choose one undisturbed patch beside the permitted route. Notice textures, lichens, wood and possible decomposition. Decomposition alone does not prove a particular fungus. For a stationary version, describe a supplied photograph and call it an image exercise.', 'event1')
end()

y=begin(4,'Event 01 / participant worksheet','One detail worth keeping.', 'Write, draw or dictate. A name is optional. Sharing is your choice.',key='sheet1')
y=ruled('Date and general place',y,1)
tag('Three things I noticed',y);y+=24
for i in range(1,4):para(str(i),M,y,20,11,'Bold',GOLD);line(y+23,M+25,CW-25);y+=52
tag('A sketch, a pattern, a detail',y);y+=22
c.setStrokeColor(HexColor(LINE));c.roundRect(M,H-y-140,CW,140,6,stroke=1,fill=0);y+=161
y=ruled('One question I want to keep',y,2)
y=ruled('Next time I could look for... / possible return date',y,1)
para('No finds today? Keep the date, route and time spent looking. “No fungi noticed” is a useful visit note.',M,y,CW,9,color=MUTED)
end()

y=event(5,'02','Make a useful record.','Observation skills  |  75 minutes  |  Short option: 45 minutes', 'One Mushroom, One Record; The Color Thief.','One encounter record and an honest list of gaps.',[
('0-10 min','Set the goal','A useful record does not need a species name. Review permission and sharing choices.'),
('10-20 min','Demonstrate the essentials','Photograph in place; add a useful detail and substrate note. Show the underside only if visible without disturbance.'),
('20-40 min','Record one encounter','Work in pairs. Photographs, sketches and written or dictated notes all have a place.'),
('40-50 min','Compare color','Look at the same surface. What changes with light, camera settings or perception?'),
('50-65 min','Exchange the evidence','What can a partner support from the record? What is missing or cannot be recovered later?'),
('65-75 min','Improve one thing','Use page 6. Explain optional posting and identification follow-up; no account is required.')],
'5 welcome + 10 demonstration + 15 recording + 10 exchange + 5 next step.',
'Which view adds information?<br/>Could someone tell what it grew on?<br/>What cannot be concluded from these photographs?',
'Use permission-cleared images with known context. Mark the sheet “practice from supplied images.” Leave unknowns unknown; do not create an iNaturalist observation from someone else\'s encounter.', 'event2')
end()

y=begin(6,'Event 02 / participant worksheet','One encounter. Clear evidence.', 'Keep photographs and notes connected. Leave unknown information unknown.',key='sheet2')
y=ruled('Encounter label / observer(s) / date',y,1)
y=ruled('Location (keep private details private)',y,1)
y=ruled('What it grew on / nearby habitat observations',y,2)
y=ruled('Images or sketches: filenames, references or notes',y,2)
y=ruled('Directly observed features',y,2)
y=ruled('Possible identity and supporting evidence, if any',y,2)
y=ruled('Missing information / one thing to improve next time',y,2)
para('<b>Before sharing:</b> agree on permission and credit. A nearby tree is context, not proof of a host relationship. A species-level name is not required.',M,y,CW,9,color=MUTED)
end()

y=event(7,'03','Follow a question together.','Collaborative question  |  90 minutes  |  Short option: 60 minutes', 'Twenty Questions, Zero Answers; The Beautifully Wrong Hypothesis.','A question, a modest observation plan and a proposed return.',[
('0-10 min','Separate the pieces','Distinguish a question, a possible explanation and an observation.'),
('10-25 min','Collect questions','Let questions accumulate before answering. No ranking or competition.'),
('25-40 min','Choose something feasible','Match the question to the time, access and equipment you actually have.'),
('40-55 min','Consider another explanation','Offer two explanations. What evidence could challenge either one?'),
('55-75 min','Try a small pilot','Use the agreed route or area. Record duration, observers, conditions and limitations.'),
('75-90 min','Interpret and plan a return','Use page 8. State what the pilot supports; record changes to the method and choose optional roles.')],
'5 welcome + 10 questions + 15 planning + 20 pilot + 10 interpretation/return.',
'Starter: What visible fungal forms do we notice along the same short route, with similar search time, on repeat visits?',
'Complete the search and record “No fungi noticed,” with effort and conditions. This documents the search, not absence of fungi. Record extra exploration separately; do not silently extend the route until you find something.', 'event3')
end()

y=begin(8,'Event 03 / group worksheet','A question we can return to.', 'Describe what the observations support. Keep stronger claims for stronger evidence.',key='sheet3')
y=ruled('Our question / why it interests us',y,2)
y=ruled('Route or area / what we will observe',y,2)
y=ruled('Search duration / number of observers / conditions',y,1)
y=ruled('How we will link records / who keeps the notes',y,1)
y=ruled('What could challenge our preferred explanation?',y,2)
y=ruled('What these observations cannot establish',y,2)
y=ruled('Next visit / optional roles / method changes',y,1)
para('<b>Keep the comparison honest.</b> Weather, season, effort, observers and detectability can affect findings. A short visit does not measure total diversity or demonstrate what caused a change. Agree on sharing and credit.',M,y,CW,9,color=MUTED)
end()

# 9: share-ready messages and links
y=begin(9,'After the walk','Leave a door open.', 'A useful follow-up is small, specific and optional.',key='followup')
y=section('Before any event: copy and adapt','No mushroom knowledge or special equipment is needed. Bring something to write with if you wish. We have an alternative if no mushrooms are visible. [Add meeting point, time, route/access details, weather plan and contact.]',y)
y=section('After a first walk','Keep one detail and one question from today. If you revisit, note when you went, how long you looked and what seemed different. A visit with no finds still belongs in your notes.',y)
y=section('After observation skills','Choose one record to keep or improve. If posting your own encounter, check date, location, photos and notes. Use an identification you can support; ask what evidence distinguishes a suggested name.',y)
y=section('After a collaborative question','Our question is [question]. We searched [area] for [duration] with [number] observers. We recorded [observations/no finds]. Our uncertainty is [uncertainty]. Next time we plan to [action]. Sharing remains optional.',y)
tag('Resources / clickable links',y);y+=22
for label,path in [('Walk plan and six printable activity cards','/learn/lead-a-walk/'),('Make an observation','/investigate/field/photography/#observation'),('Respond to a suggested identification','/investigate/field/identifying/#suggested-id'),('Keep a return-visit record','/one-place/#return-visit'),('Know Your Woods','/neo-myco/know-your-woods/')]:y=url(label,path,y)
para('MycoView does not save personal visit entries; keep your own notes. These activities do not require NEO Myco membership. Proposed facilitator adaptations, not a validated curriculum. Resource links are based on the reviewed materials; fresh live-link checks remain pending.',M,y+3,CW,8.5,color=MUTED)
end();c.save()

print(OUT)

