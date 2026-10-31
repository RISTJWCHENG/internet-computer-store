import {searchIcp} from './icp-client.js';
export async function searchProjectsV3(query,category,page=1,limit=10){return searchIcp(query,category,page,limit);}
