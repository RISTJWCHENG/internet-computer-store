import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {initFavorites} from '../web/src/favorites.js';
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this.hidden=false;this.classList={add:c=>this.cls=c};}
 setAttribute(k,v){this.attrs[k]=v;}
 appendChild(n){this.children.push(n);return n;}
 prepend(n){this.children.unshift(n);}
 querySelector(s){return this.children.find(n=>s==='svg'?n.tag==='svg':s==='svg.catalog-dots16'&&n.cls==='catalog-dots16')||null;}
 querySelectorAll(s){return this.children.filter(n=>n.tag===s);}
 addEventListener(k,f){this.listeners[k]=f;}
 focus(){this.focused=true;}
 closest(s){return s==='.account-apps-btn'&&this.launcher?this:null;}
 getBoundingClientRect(){return {bottom:40,right:900};}
 contains(n){return n===this;}
 replaceChildren(){this.children=[];}
}
test('the renamed launcher retains 16 dots, original dimensions, hover colors and reset',()=>{
 const button=new Element();const styles=[];const timers=new Map();
 const document={readyState:'complete',body:{},head:{appendChild:n=>styles.push(n)},createElement:t=>new Element(t),createElementNS:(_ns,t)=>new Element(t),querySelectorAll:s=>s==='.account-apps-btn'?[button]:[]};
 const window={matchMedia:()=>({matches:false}),setInterval:(f,ms)=>{assert.equal(ms,100);timers.set(1,f);return 1;},clearInterval:id=>timers.delete(id)};
 vm.runInNewContext(readFileSync(new URL('../web/public/catalog-16-dots.js',import.meta.url),'utf8'),{document,window,MutationObserver:class{observe(){}},requestAnimationFrame:f=>f()});
 const svg=button.querySelector('svg');assert.equal(svg.attrs.width,'36');assert.equal(svg.children.length,16);
 assert.match(styles[0].textContent,/width: 40px !important/);
 assert.ok(svg.children.every(d=>d.attrs.fill==='#8996a8'));
 button.listeners.pointerenter();
 const colored=svg.children.filter(d=>d.attrs.fill!=='#8996a8').length;
 assert.ok(colored>=1&&colored<=3);assert.equal(timers.size,1);
 timers.get(1)();button.listeners.pointerleave();
 assert.equal(timers.size,0);assert.ok(svg.children.every(d=>d.attrs.fill==='#8996a8'));
});
test('the renamed launcher opens and closes the favorites dialog instead of navigating',()=>{
 const saved={document:globalThis.document,window:globalThis.window,MutationObserver:globalThis.MutationObserver,requestAnimationFrame:globalThis.requestAnimationFrame};
 try{
 const launcher=new Element();launcher.launcher=true;const added=[];const events={};const nodes={};
 const document={head:{appendChild(){}},body:{appendChild:n=>added.push(n)},createElement:t=>{const n=new Element(t);n.querySelector=s=>nodes[s]??=(new Element());return n;},querySelectorAll:s=>s==='.account-apps-btn'?[launcher]:[],querySelector:s=>s==='.account-apps-btn'?launcher:null,addEventListener:(k,f)=>events[k]=f};
 Object.assign(globalThis,{document,window:{innerWidth:1000,innerHeight:800,addEventListener(){}},MutationObserver:class{observe(){}},requestAnimationFrame:f=>f()});
 initFavorites(()=>null);
 const panel=added.find(n=>n.id==='catalog-favorites-popover');assert.ok(panel.hidden);
 let prevented=0;const event={target:launcher,preventDefault(){prevented++;},stopPropagation(){}};
 events.click(event);assert.equal(panel.hidden,false);assert.equal(launcher.attrs['aria-expanded'],'true');assert.equal(prevented,1);
 assert.match(nodes['.catalog-fav-empty'].textContent,/Sign in/);
 events.click(event);assert.equal(panel.hidden,true);assert.equal(launcher.attrs['aria-expanded'],'false');
 }finally{Object.assign(globalThis,saved);}
});
