export const idlFactory = ({IDL}) => {
  const Source=IDL.Record({sourceType:IDL.Text,sourceUrl:IDL.Text,collectedAt:IDL.Text});
  const Canister=IDL.Record({canisterId:IDL.Text,role:IDL.Text});
  const Project=IDL.Record({id:IDL.Text,name:IDL.Text,description:IDL.Text,category:IDL.Text,websiteUrl:IDL.Text,logoUrl:IDL.Text,githubUrl:IDL.Text,source:IDL.Text,status:IDL.Text,relationship:IDL.Text,evidenceUrl:IDL.Text,updatedAt:IDL.Text,tags:IDL.Vec(IDL.Text),canisters:IDL.Vec(Canister),sources:IDL.Vec(Source)});
  const Profile=IDL.Record({name:IDL.Text,bio:IDL.Text,role:IDL.Text,website:IDL.Text,github:IDL.Text,avatar:IDL.Text,interests:IDL.Vec(IDL.Text)});
  const Favorite=IDL.Record({href:IDL.Text,name:IDL.Text,logo:IDL.Text});
  const UserData=IDL.Record({profile:Profile,favorites:IDL.Vec(Favorite)});
  const result=type=>IDL.Variant({ok:type,err:IDL.Text});
  return IDL.Service({
    health:IDL.Func([],[IDL.Text],['query']),whoami:IDL.Func([],[IDL.Principal],['query']),
    is_administrator:IDL.Func([],[IDL.Bool],['query']),
    administrator_session:IDL.Func([],[IDL.Record({authenticated:IDL.Bool,writesEnabled:IDL.Bool})],['query']),
    set_administrator:IDL.Func([IDL.Principal,IDL.Bool],[result(IDL.Null)],[]),
    set_importer:IDL.Func([IDL.Principal,IDL.Bool],[result(IDL.Null)],[]),
    search:IDL.Func([IDL.Text,IDL.Text,IDL.Nat,IDL.Nat],[IDL.Record({records:IDL.Vec(Project),count:IDL.Nat})],['query']),
    list_admin_projects:IDL.Func([],[result(IDL.Vec(Project))],['query']),
    save_project:IDL.Func([Project],[result(IDL.Null)],[]),
    delete_imported_projects:IDL.Func([IDL.Vec(IDL.Text)],[result(IDL.Nat)],[]),
    import_projects:IDL.Func([IDL.Vec(Project)],[result(IDL.Nat)],[]),
    get_my_data:IDL.Func([],[result(UserData)],['query']),
    save_my_profile:IDL.Func([Profile],[result(IDL.Null)],[]),
    save_my_favorites:IDL.Func([IDL.Vec(Favorite)],[result(IDL.Null)],[]),
    delete_my_data:IDL.Func([],[result(IDL.Null)],[])
  });
};
export function unwrap(result) {
  if(result && Object.hasOwn(result,'ok'))return result.ok;
  throw Error(typeof result?.err==='string'?result.err:'Invalid canister response');
}
