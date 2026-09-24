#!/usr/bin/env python3
"""Synthesise all music and SFX for UNDRAWN (numpy only, ffmpeg for ogg)."""
import numpy as np, os, subprocess, math, random, wave, sys
SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")
os.makedirs(OUT, exist_ok=True)
NOTES = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
def freq(n):
    if isinstance(n,(int,float)): return float(n)
    name, octv = n[:-1], int(n[-1])
    return 440.0*2**((NOTES[name]+(octv-4)*12-9)/12)
def env(n, a=0.005, d=0.1, s=0.6, r=0.2, dur=None):
    """ADSR envelope over n samples."""
    t = np.arange(n)/SR; total = n/SR
    e = np.ones(n)
    A = int(a*SR); D = int(d*SR); R = int(min(r, total)*SR)
    if A>0: e[:A] = np.linspace(0,1,min(A,n))[:min(A,n)].tolist()+[1]*max(0,A-n) if False else e[:A]*np.linspace(0,1,A)[:n]
    if D>0 and A<n: seg = e[A:A+D]; e[A:A+D] = seg*np.linspace(1,s,len(seg))
    if A+D<n: e[A+D:] *= s
    if R>0: e[-R:] *= np.linspace(1,0,R)
    return e
# ---------- instruments: return float array for freq f, dur seconds, vel 0..1
def i_musicbox(f, dur, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    w = np.sin(2*np.pi*f*t)+0.35*np.sin(2*np.pi*f*4*t)*np.exp(-t*6)+0.15*np.sin(2*np.pi*f*6.2*t)*np.exp(-t*9)
    return w*np.exp(-t*3.2)*vel*0.5
def i_piano(f, dur, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    w = (np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*2*f*t)*np.exp(-t*2)+0.25*np.sin(2*np.pi*3*f*t)*np.exp(-t*4)+0.1*np.sin(2*np.pi*4.01*f*t)*np.exp(-t*5))
    return w*np.exp(-t*1.6)*env(n,0.003,0.05,0.9,0.15)*vel*0.45
def i_pad(f, dur, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    w = sum(np.sin(2*np.pi*f*(1+d)*t+ph) for d,ph in ((0,0),(0.004,1),(-0.004,2),(0.5-0.5,0)))/4
    w += 0.3*np.sin(2*np.pi*f*2*t)*np.sin(t*0.7)**2
    return w*env(n,0.6,0.2,0.8,0.8)*vel*0.35
def i_pluck(f, dur, vel=1):  # karplus-strong-ish bass/pluck
    n=int(dur*SR); N=max(2,int(SR/f)); buf=np.random.uniform(-1,1,N); out=np.zeros(n)
    for i in range(n):
        out[i]=buf[i%N]; buf[i%N]=0.5*(buf[i%N]+buf[(i+1)%N])*0.996
    return out*vel*0.6
def i_square(f, dur, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    w = np.sign(np.sin(2*np.pi*f*t))*0.5+0.25*np.sign(np.sin(2*np.pi*f*t*2+0.5))
    return w*env(n,0.01,0.08,0.6,0.08)*vel*0.32
def i_tri(f, dur, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    w = 2/np.pi*np.arcsin(np.sin(2*np.pi*f*t))
    return w*env(n,0.01,0.1,0.7,0.1)*vel*0.5
def i_bell(f, dur, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    w = np.sin(2*np.pi*f*t)*np.exp(-t*2.5)+0.6*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*5)+0.3*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*8)
    return w*vel*0.4
def i_drone(f, dur, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    w = np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*f*1.01*t)+0.3*np.sin(2*np.pi*f*0.5*t)+0.2*np.sin(2*np.pi*f*3.02*t)*np.sin(t*0.3)**2
    return w*env(n,1.5,0.5,0.8,1.5)*vel*0.25
def d_kick(dur=0.25, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    return np.sin(2*np.pi*(60+120*np.exp(-t*30))*t)*np.exp(-t*12)*vel
def d_snare(dur=0.2, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    return (np.random.uniform(-1,1,n)*0.7+0.3*np.sin(2*np.pi*180*t))*np.exp(-t*20)*vel*0.7
def d_hat(dur=0.08, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    w=np.random.uniform(-1,1,n); w=np.diff(w,prepend=0)
    return w*np.exp(-t*50)*vel*0.35
def d_shaker(dur=0.12, vel=1):
    n=int(dur*SR); t=np.arange(n)/SR
    return np.random.uniform(-1,1,n)*np.exp(-t*25)*vel*0.2
INST = dict(musicbox=i_musicbox, piano=i_piano, pad=i_pad, pluck=i_pluck, square=i_square, tri=i_tri, bell=i_bell, drone=i_drone)
# ---------- effects
def delay(x, time=0.3, fb=0.35, mix=0.3):
    d=int(time*SR); y=x.copy()
    for i in range(1,5):
        g=fb**i
        if d*i>=len(x): break
        y[d*i:] += x[:-d*i]*g*mix
    return y
def reverb(x, size=0.9, mix=0.25):
    y=x.copy()
    for t,g in ((0.0297,0.8),(0.0371,0.75),(0.0411,0.7),(0.0437,0.65),(0.0733,0.5),(0.0997,0.4)):
        d=int(t*SR*size*2)
        if d<len(x): y[d:] += x[:-d]*g*mix
    return y
def lowpass(x, alpha=0.15):
    y=np.zeros_like(x); acc=0.0
    # simple one-pole via cumulative exponential (vectorised approx using scipy-less loop in chunks)
    b=alpha; a=1-alpha
    # use recursion via numpy trick: y[n]=b*x[n]+a*y[n-1]
    from itertools import accumulate
    y=np.fromiter(accumulate(x*b, lambda acc,v: acc*a+v), dtype=float, count=len(x))
    return y
def normalize(x, peak=0.85):
    m=np.max(np.abs(x))+1e-9
    return x/m*peak
# ---------- sequencer
class Song:
    def __init__(s, bpm, length_beats, swing=0.0):
        s.bpm=bpm; s.spb=60/bpm; s.n=int(length_beats*s.spb*SR)+SR; s.buf=np.zeros(s.n); s.swing=swing
    def note(s, inst, name, beat, dur_beats, vel=0.8):
        if name is None: return
        f=freq(name); w=INST[inst](f, dur_beats*s.spb*1.05, vel)
        st=int(beat*s.spb*SR)
        if s.swing and int(beat*2)%2==1: st+=int(s.swing*s.spb*SR)
        e=min(s.n, st+len(w)); s.buf[st:e]+=w[:e-st]
    def chord(s, inst, names, beat, dur, vel=0.6):
        for nm in names: s.note(inst, nm, beat, dur, vel)
    def hit(s, drum, beat, vel=1):
        w={'k':d_kick,'s':d_snare,'h':d_hat,'x':d_shaker}[drum](vel=vel); st=int(beat*s.spb*SR)
        e=min(s.n, st+len(w)); s.buf[st:e]+=w[:e-st]
    def render(s, loop_beats=None, fx=()):
        x=s.buf
        if loop_beats:  # fold tail into start for seamless loop
            L=int(loop_beats*s.spb*SR); tail=x[L:]; x=x[:L].copy(); x[:len(tail)]+=tail
        for f in fx: x=f(x)
        return normalize(x)
def write(name, x, ogg=True):
    x=np.clip(x,-1,1); path=os.path.join(OUT, name+".wav")
    with wave.open(path,'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype('<i2').tobytes())
    if ogg:
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",path,"-c:a","libvorbis","-q:a","4",os.path.join(OUT,name+".ogg")],check=True)
        os.remove(path)
    print("wrote", name)
# chord helpers
def tri(root, kind='maj', octv=4):
    r=NOTES[root]; ints={'maj':(0,4,7),'min':(0,3,7),'maj7':(0,4,7,11),'min7':(0,3,7,10),'dom7':(0,4,7,10),'sus2':(0,2,7),'add9':(0,4,7,14),'dim':(0,3,6)}[kind]
    out=[]
    for i in ints:
        semi=r+i; o=octv+semi//12; semi%=12
        out.append([k for k,v in NOTES.items() if v==semi and '#' not in k and 'b' not in k or (v==semi and k in('C#','Eb','F#','Ab','Bb'))][0]+str(o))
    return out
random.seed(7)
# ================== MUSIC ==================
def title():
    s=Song(72, 64)
    prog=[('A','min7'),('F','maj7'),('C','maj7'),('G','maj'),('A','min7'),('F','maj7'),('E','min7'),('E','min7')]
    mel=['E5','C5','D5','E5','G5','E5','D5','C5','A4','C5','E5','D5','C5','B4','A4',None]
    for rep in range(2):
        for i,(r,k) in enumerate(prog):
            b=rep*32+i*4
            s.chord('pad', tri(r,k,3), b, 4, 0.5)
            s.note('pluck', r+'2', b, 2, 0.5); s.note('pluck', r+'2', b+2.5, 1, 0.3)
            for j in range(4):
                m=mel[(i*2+j)%16]
                s.note('musicbox', m, b+j, 1, 0.7 if rep else 0.5)
    return s.render(64, (lambda x: delay(x,0.42,0.4,0.35), reverb))
def bedroom():
    s=Song(60, 64)
    prog=[('D','min'),('Bb','maj7'),('F','maj7'),('A','min')]
    for rep in range(4):
        for i,(r,k) in enumerate(prog):
            b=rep*16+i*4
            c=tri(r,k,3)
            s.note('piano', c[0], b, 3, 0.5); s.note('piano', c[2], b+1.5, 2, 0.35); s.note('piano', c[1]+'', b+2.5, 1.5, 0.3)
            if rep%2==1: s.note('piano', c[(rep+i)%3][:-1]+'5', b+random.choice([0.5,1,3]), 2, 0.3)
    return s.render(64, (lambda x: reverb(x,1.4,0.4),))
def meadow():
    s=Song(124, 64, swing=0.08)
    prog=[('C','maj7'),('A','min7'),('F','maj7'),('G','dom7'),('C','maj7'),('E','min7'),('F','maj7'),('G','dom7')]
    mel=['E5','G5','A5','G5','E5','D5','C5','D5','E5','C5','D5','E5','G5','A5','G5',None,
         'A5','G5','E5','D5','C5','D5','E5','G5','F5','E5','D5','C5','D5','E5','C5',None]
    for rep in range(2):
        for i,(r,k) in enumerate(prog):
            b=rep*32+i*4
            s.chord('musicbox', tri(r,k,4), b, 1.5, 0.35); s.chord('musicbox', tri(r,k,4), b+2, 1.5, 0.3)
            for j in range(8): s.note('pluck', r+('2' if j%4==0 else '3'), b+j*0.5, 0.5, 0.45 if j%2==0 else 0.25)
            for j in range(4):
                m=mel[(i*4+j)%32]; s.note('tri' if rep else 'musicbox', m, b+j, 0.9, 0.6)
            for j in range(4): s.hit('x', b+j+0.5, 0.6); s.hit('h', b+j, 0.5)
            s.hit('k', b, 0.7); s.hit('k', b+2.5, 0.5); s.hit('s', b+1, 0.35); s.hit('s', b+3, 0.35)
    return s.render(64, (lambda x: delay(x,0.24,0.3,0.2), lambda x: reverb(x,0.8,0.15)))
def woods():
    s=Song(140, 96)  # 3/4 waltz, 32 bars
    prog=[('E','min'),('E','min'),('C','maj7'),('D','maj'),('E','min'),('G','maj'),('B','dom7'),('E','min')]
    mel=['B4','E5','G5','F#5','E5','D#5','E5','G5','B5','A5','G5','F#5','G5','E5','B4','E4']
    for rep in range(4):
        for i,(r,k) in enumerate(prog):
            b=rep*24+i*3
            s.note('pluck', r+'2', b, 1, 0.6); s.chord('pluck', tri(r,k,4)[1:], b+1, 0.8, 0.3); s.chord('pluck', tri(r,k,4)[1:], b+2, 0.8, 0.3)
            if rep>=1:
                for j in range(3): s.note('bell', mel[(i*3+j+rep*5)%16], b+j*(1 if rep<3 else 0.5), 1.2, 0.5 if j==0 else 0.35)
            if rep>=2: s.chord('pad', tri(r,k,3), b, 3, 0.25)
    return s.render(96, (lambda x: delay(x,0.43,0.35,0.25), lambda x: reverb(x,1.2,0.3)))
def marsh():
    s=Song(84, 64)
    prog=[('F','maj7'),('G','maj'),('A','min7'),('G','maj'),('F','maj7'),('E','min7'),('D','min7'),('G','sus2')]
    mel=['A5','B5','C6','B5','A5','E5','F#5','E5','D5','E5','A5','G5','E5','D5','C5','E5']
    for rep in range(2):
        for i,(r,k) in enumerate(prog):
            b=rep*32+i*4
            s.chord('pad', tri(r,k,3), b, 4.2, 0.55); s.note('drone', r+'2', b, 4.2, 0.4)
            for j in range(4): s.note('bell', mel[(i*2+j)%16] if (j%2==0 or rep) else None, b+j, 1.5, 0.45)
            for j in range(8):
                if random.random()<0.35: s.hit('x', b+j*0.5, 0.35)
    return s.render(64, (lambda x: delay(x,0.36,0.45,0.35), lambda x: reverb(x,1.5,0.4)))
def blank():
    s=Song(60, 64)
    for i in range(8):
        b=i*8; r=['A','A','Bb','A','A','Ab','A','A'][i]
        s.note('drone', r+'2', b, 8.5, 0.6); s.note('drone', r+'3', b+2, 6, 0.25)
        if i%2: s.note('bell', random.choice(['E5','Eb5','A5','B5','F5']), b+random.uniform(0,6), 3, 0.3)
        if i>=4: s.note('musicbox', random.choice(['A6','E6','C6']), b+random.uniform(0,7), 1, 0.2)
    return s.render(64, (lambda x: reverb(x,2.0,0.5), lambda x: delay(x,0.7,0.5,0.4)))
def battle():
    s=Song(150, 64)
    prog=[('A','min'),('A','min'),('F','maj'),('G','maj'),('A','min'),('C','maj'),('F','maj'),('E','maj')]
    mel=['A4','C5','E5','A5','G5','E5','D5','C5','D5','E5','F5','E5','D5','C5','B4','C5',
         'E5','E5','G5','E5','D5','C5','A4','C5','B4','B4','D5','B4','A4','G4','A4',None]
    for rep in range(2):
        for i,(r,k) in enumerate(prog):
            b=rep*32+i*4
            for j in range(8): s.note('pluck', r+('2' if j%2==0 else '3'), b+j*0.5, 0.45, 0.6)
            for j in range(4): s.note('square', mel[(i*4+j)%32], b+j, 0.7, 0.55)
            s.chord('tri', tri(r,k,4), b, 0.5, 0.25); s.chord('tri', tri(r,k,4), b+1.5, 0.5, 0.25); s.chord('tri', tri(r,k,4), b+3, 0.5, 0.25)
            for j in range(4): s.hit('k', b+j, 0.9); s.hit('s', b+j+0.5, 0.6 if j%2 else 0.4); s.hit('h', b+j+0.25, 0.4); s.hit('h', b+j+0.75, 0.4)
    return s.render(64, (lambda x: delay(x,0.2,0.25,0.15),))
def boss():
    s=Song(160, 64)
    prog=[('D','min'),('D','min'),('Bb','maj'),('A','maj'),('D','min'),('F','maj'),('G','min'),('A','dom7')]
    mel=['D5','F5','A5','D6','C6','A5','F5','A5','G5','F5','E5','F5','E5','D5','C#5','D5',
         'A5','A5','Bb5','A5','G5','F5','D5','F5','E5','E5','F5','E5','D5','C#5','D5',None]
    for rep in range(2):
        for i,(r,k) in enumerate(prog):
            b=rep*32+i*4
            for j in range(8): s.note('pluck', r+'2', b+j*0.5, 0.4, 0.7 if j%2==0 else 0.4)
            for j in range(4): s.note('square', mel[(i*4+j)%32], b+j, 0.75, 0.6); 
            s.chord('pad', tri(r,k,3), b, 4, 0.35)
            for j in range(4): s.hit('k', b+j, 1); s.hit('k', b+j+0.75, 0.6); s.hit('s', b+j+0.5, 0.7); s.hit('h', b+j+0.25, 0.4)
    return s.render(64, (lambda x: delay(x,0.19,0.3,0.15), lambda x: reverb(x,0.7,0.15)))
def final():
    s=Song(96, 64)
    prog=[('C','min'),('Ab','maj7'),('Eb','maj7'),('Bb','maj'),('C','min'),('Ab','maj7'),('G','dom7'),('G','dom7')]
    mel=['G5','Eb5','C5','D5','Eb5','F5','G5','Ab5','G5','F5','Eb5','D5','C5','D5','Eb5','D5']
    for rep in range(2):
        for i,(r,k) in enumerate(prog):
            b=rep*32+i*4
            s.chord('pad', tri(r,k,3), b, 4, 0.5); s.note('drone', r+'2', b, 4, 0.5)
            for j in range(4): s.note('piano', mel[(i*2+j)%16], b+j, 1.2, 0.6)
            if rep: 
                for j in range(4): s.hit('k', b+j, 0.8); s.hit('s', b+j+0.5, 0.4)
                for j in range(8): s.note('pluck', r+'2', b+j*0.5, 0.4, 0.5)
    return s.render(64, (lambda x: delay(x,0.31,0.35,0.25), lambda x: reverb(x,1.2,0.3)))
def ending_keep():
    s=Song(76, 64)
    prog=[('C','maj7'),('G','maj'),('A','min7'),('F','maj7'),('C','maj7'),('E','min7'),('F','maj7'),('G','sus2')]
    mel=['E5','G5','C6','B5','G5','E5','D5','E5','C5','E5','A5','G5','E5','D5','C5','D5']
    for rep in range(2):
        for i,(r,k) in enumerate(prog):
            b=rep*32+i*4
            c=tri(r,k,3); s.note('piano', c[0], b, 2, 0.5); s.chord('piano', c[1:], b+0.5, 1.5, 0.35); s.chord('piano', c[1:], b+2.5, 1.5, 0.3)
            for j in range(4): s.note('piano' if rep==0 else 'musicbox', mel[(i*2+j)%16], b+j, 1.4, 0.6)
            if rep: s.chord('pad', tri(r,k,3), b, 4, 0.3)
    return s.render(64, (lambda x: reverb(x,1.3,0.35),))
def ending_sad():
    s=Song(56, 48)
    prog=[('A','min'),('F','maj7'),('D','min'),('E','min')]*3
    for i,(r,k) in enumerate(prog):
        b=i*4; c=tri(r,k,3)
        s.note('piano', c[0], b, 3, 0.4); s.note('piano', c[2], b+2, 2, 0.3)
        if i%3==1: s.note('musicbox', c[1][:-1]+'5', b+1, 2, 0.3)
    return s.render(48, (lambda x: reverb(x,2,0.5),))
def victory():
    s=Song(140, 8)
    for i,n in enumerate(['C5','E5','G5','C6']): s.note('square', n, i*0.5, 0.5, 0.6); s.note('pluck', n[:-1]+'3', i*0.5, 0.5, 0.5)
    s.chord('square', ['G5','C6','E6'], 2, 1.5, 0.5); s.chord('tri', ['C4','E4','G4'], 2, 2, 0.4)
    s.hit('k',0); s.hit('k',1); s.hit('s',2)
    return s.render(None, ())
def gameover():
    s=Song(70, 12)
    for i,n in enumerate(['E4','Eb4','D4','C#4']): s.note('piano', n, i*1.5, 2, 0.5)
    s.chord('pad', ['A2','E3','A3'], 5, 5, 0.5)
    return s.render(None, (lambda x: reverb(x,1.5,0.4),))
def shop():
    s=Song(110, 32, swing=0.1)
    prog=[('F','maj7'),('E','min7'),('D','min7'),('C','maj7')]*2
    for i,(r,k) in enumerate(prog):
        b=i*4; s.chord('musicbox', tri(r,k,4), b, 2, 0.4); s.chord('musicbox', tri(r,k,4), b+2, 2, 0.3)
        for j in range(4): s.note('pluck', r+'2', b+j, 0.8, 0.4); s.hit('x', b+j+0.5, 0.4)
    return s.render(32, (lambda x: reverb(x,0.8,0.2),))
# ================== SFX ==================
def sfx_tone(freqs, dur, inst='square', vel=0.6, slide=0):
    n=int(dur*SR); t=np.arange(n)/SR; out=np.zeros(n)
    for f in freqs:
        fi = f*(1+slide*t/dur)
        ph = 2*np.pi*np.cumsum(fi)/SR
        w = np.sign(np.sin(ph)) if inst=='square' else np.sin(ph) if inst=='sine' else 2/np.pi*np.arcsin(np.sin(ph))
        out += w
    return out/len(freqs)*env(n,0.002,0.03,0.7,min(0.08,dur/2))*vel
def sfx_noise(dur, vel=0.5, decay=20, lp=0):
    n=int(dur*SR); t=np.arange(n)/SR; w=np.random.uniform(-1,1,n)
    if lp: w=lowpass(w, lp)
    return w*np.exp(-t*decay)*vel
def seq(*parts):
    return np.concatenate(parts)
SFX = {
 'cursor':  lambda: sfx_tone([880],0.05,'square',0.35),
 'confirm': lambda: seq(sfx_tone([660],0.06,'square',0.4), sfx_tone([990],0.09,'square',0.4)),
 'cancel':  lambda: seq(sfx_tone([500],0.06,'square',0.4), sfx_tone([330],0.1,'square',0.4)),
 'blip':    lambda: sfx_tone([1200],0.03,'tri',0.3),
 'hit':     lambda: seq(sfx_noise(0.12,0.8,25), sfx_tone([120],0.1,'sine',0.5,-0.6)),
 'crit':    lambda: seq(sfx_noise(0.05,0.9,15), sfx_tone([90,180],0.25,'square',0.6,-0.5)),
 'miss':    lambda: sfx_tone([600],0.15,'sine',0.35,-0.5),
 'heal':    lambda: seq(sfx_tone([523],0.08,'sine',0.5), sfx_tone([659],0.08,'sine',0.5), sfx_tone([784],0.2,'sine',0.5)),
 'buff':    lambda: sfx_tone([440],0.3,'tri',0.45,0.8),
 'debuff':  lambda: sfx_tone([440],0.3,'tri',0.45,-0.5),
 'item':    lambda: seq(sfx_tone([784],0.07,'square',0.4), sfx_tone([1046],0.12,'square',0.4)),
 'encounter': lambda: seq(sfx_tone([200,203],0.15,'square',0.5,2.0), sfx_noise(0.25,0.6,8)),
 'levelup': lambda: seq(*[sfx_tone([f],0.09,'square',0.45) for f in (523,659,784,1046)], sfx_tone([1318],0.3,'square',0.45)),
 'door':    lambda: seq(sfx_noise(0.1,0.4,30,0.3), sfx_tone([180],0.12,'sine',0.3,-0.3)),
 'save':    lambda: seq(sfx_tone([659],0.08,'sine',0.5), sfx_tone([880],0.08,'sine',0.5), sfx_tone([1318],0.25,'sine',0.5)),
 'step':    lambda: sfx_noise(0.05,0.25,60,0.2),
 'faded':   lambda: seq(sfx_tone([400],0.25,'sine',0.5,-0.7), sfx_noise(0.3,0.3,10,0.15)),
 'mood_brave': lambda: seq(sfx_tone([330],0.08,'square',0.5), sfx_tone([440],0.08,'square',0.5), sfx_tone([554],0.15,'square',0.5)),
 'mood_blue':  lambda: seq(sfx_tone([440],0.12,'sine',0.5), sfx_tone([415],0.12,'sine',0.5), sfx_tone([349],0.25,'sine',0.5)),
 'mood_giddy': lambda: seq(*[sfx_tone([f],0.05,'square',0.45) for f in (660,880,660,880,1100)]),
 'doodle':  lambda: seq(sfx_noise(0.15,0.7,10), sfx_tone([220,330,440],0.5,'square',0.5,1.0)),
 'smudge':  lambda: sfx_tone([300,306],0.2,'tri',0.4,-0.3),
 'page':    lambda: sfx_noise(0.25,0.5,12,0.35),
 'erase':   lambda: seq(sfx_noise(0.4,0.5,6,0.12), sfx_tone([80],0.3,'sine',0.4,-0.5)),
 'heartbeat': lambda: seq(sfx_tone([55],0.12,'sine',0.8,-0.3), np.zeros(int(0.15*SR)), sfx_tone([50],0.15,'sine',0.7,-0.3)),
}
if __name__=='__main__':
    which = sys.argv[1:] 
    music = dict(title=title, bedroom=bedroom, meadow=meadow, woods=woods, marsh=marsh, blank=blank, battle=battle, boss=boss, final=final, ending_keep=ending_keep, ending_sad=ending_sad, victory=victory, gameover=gameover, shop=shop)
    for k,f in music.items():
        if which and k not in which: continue
        write('bgm_'+k, f())
    for k,f in SFX.items():
        if which and k not in which and 'sfx' not in which: continue
        write('sfx_'+k, normalize(f(), 0.8))
