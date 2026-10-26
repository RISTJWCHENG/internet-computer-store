import {candidate} from './model.mjs';
import {checkedFetch} from './network.mjs';
export function parseGithub(data,observedAt,{minStars=2}={}){
 return (data?.items||[]).filter(r=>!r.fork&&!r.archived&&r.stargazers_count>=minStars&&r.homepage&&r.html_url&&r.topics?.includes('internet-computer')).flatMap(r=>{
  try{const u=new URL(r.homepage);if(u.hostname==='github.com'||u.hostname==='www.github.com')return [];return [candidate({name:r.name,description:r.description,websiteUrl:r.homepage,githubUrl:r.html_url,sourceType:'github',sourceUrl:r.html_url,externalId:String(r.id),observedAt,evidence:['github_internet_computer_topic','public_repository','minimum_stars_met']})]}catch{return []}
 });
}
export async function discoverGithub({observedAt,pages=2,minStars=2,token='',fetchJson}={}){
 const fn=fetchJson|| (async url=>(await checkedFetch(url,{json:true,headers:{'Accept':'application/vnd.github+json',...(token?{'Authorization':`Bearer ${token}`}:{})}})).data);
 const rows=[];
 for(let page=1;page<=pages;page++){
  const u=new URL('https://api.github.com/search/repositories');u.searchParams.set('q','topic:internet-computer');u.searchParams.set('sort','updated');u.searchParams.set('per_page','100');u.searchParams.set('page',String(page));
  const data=await fn(u.href);rows.push(...parseGithub(data,observedAt,{minStars}));if((data?.items||[]).length<100)break;
 }return rows;
}
