import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import targets from '../../canister_ids.json' with {type:'json'};
import {idlFactory,unwrap} from '../../icp/interface.js';
import {fromCanisterProject,toCanisterProject} from '../../icp/project-model.js';
export const usingIcp=true;
export const backendCanisterId=targets.backend.ic;
let identityProvider=async()=>null, anonymousActor;
export function setIdentityProvider(provider){identityProvider=provider;}
export async function actorFor(identity=null){
  if(!identity&&anonymousActor)return anonymousActor;
  const agent=await HttpAgent.create({host:'https://icp-api.io',...(identity?{identity}:{})});
  const actor=Actor.createActor(idlFactory,{agent,canisterId:backendCanisterId});
  if(!identity)anonymousActor=actor;return actor;
}
export async function signedActor(){const identity=await identityProvider();if(!identity||identity.getPrincipal().isAnonymous())throw Error('Sign in with Internet Identity.');return actorFor(identity);}
export async function searchIcp(query='',category='',page=1,limit=30){const actor=await actorFor();const data=await actor.search(String(query).slice(0,150),String(category),BigInt(Math.max(0,(page-1)*limit)),BigInt(Math.min(30,Math.max(1,limit))));return {records:data.records.map(fromCanisterProject),count:Number(data.count),page,limit};}
export async function administratorAccess(){const identity=await identityProvider();if(!identity)return null;const actor=await actorFor(identity);return await actor.is_administrator()?{identity,transport:'icp'}:null;}
export async function adminRequest(identity,path,options={}){const actor=await actorFor(identity);if(path==='/api/ii/session')return actor.administrator_session();if(path==='/api/projects'&&options.method==='POST'){unwrap(await actor.save_project(toCanisterProject(JSON.parse(options.body),'manual')));return {ok:true};}if(path==='/api/projects')return {projects:unwrap(await actor.list_admin_projects()).map(fromCanisterProject)};throw Error('Unsupported administrator operation');}
export async function readMyData(){return unwrap(await (await signedActor()).get_my_data());}
export async function saveMyProfile(profile){unwrap(await (await signedActor()).save_my_profile(profile));}
export async function saveMyFavorites(favorites){const clean=favorites.map(item=>({...item,logo:/^https:\/\//i.test(item.logo||'')?item.logo:''}));unwrap(await (await signedActor()).save_my_favorites(clean));}
export async function deleteMyData(){unwrap(await (await signedActor()).delete_my_data());}
