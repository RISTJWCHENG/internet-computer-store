import Array "mo:base/Array";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Prim "mo:prim";

shared persistent actor class Store(initialAdmin : Principal) = this {
  public type Source = { sourceType : Text; sourceUrl : Text; collectedAt : Text };
  public type Canister = { canisterId : Text; role : Text };
  public type Project = {
    id : Text; name : Text; description : Text; category : Text;
    websiteUrl : Text; logoUrl : Text; githubUrl : Text; source : Text;
    status : Text; relationship : Text; evidenceUrl : Text; updatedAt : Text;
    tags : [Text]; canisters : [Canister]; sources : [Source]
  };
  public type Profile = { name : Text; bio : Text; role : Text; website : Text; github : Text; avatar : Text; interests : [Text] };
  public type Favorite = { href : Text; name : Text; logo : Text };
  public type UserData = { profile : Profile; favorites : [Favorite] };
  public type Result<T> = { #ok : T; #err : Text };
  var projects : [Project] = [];
  var users : [(Principal, UserData)] = [];
  var administrators : [Principal] = if (Principal.isAnonymous(initialAdmin)) [] else [initialAdmin];
  var importers : [Principal] = [];
  let defaultProfile : Profile = { name=""; bio=""; role="Explorer"; website=""; github=""; avatar="🪐"; interests=[] };

  func includes(list : [Principal], value : Principal) : Bool { Array.find<Principal>(list,func(p) { p == value }) != null };
  func admin(who : Principal) : Bool { not Principal.isAnonymous(who) and (Prim.isController(who) or includes(administrators,who)) };
  func authenticated(who : Principal) : Bool { not Principal.isAnonymous(who) };
  func lower(value : Text) : Text { Text.toLowercase(value) };
  func url(value : Text, required : Bool) : Bool {
    if (value == "") return not required;
    value.size() <= 2048 and Text.startsWith(value,#text "https://") and value.size() > 8 and not Text.contains(value,#char '\n') and not Text.contains(value,#char '\r') and not Text.contains(value,#char '@') and not Text.contains(value,#char ' ')
  };
  func validProject(p : Project) : Bool {
    for(c in p.id.chars()){if(not ((c >= 'a' and c <= 'z') or (c >= '0' and c <= '9') or c == '-'))return false};
    if (p.id.size()==0 or p.id.size() > 100 or p.name.size()==0 or p.name.size() > 100 or p.description.size() > 4000) return false;
    if (p.category.size() > 80 or p.tags.size() > 20 or p.canisters.size() > 30 or p.sources.size() > 20) return false;
    if (not url(p.websiteUrl,true) or not url(p.logoUrl,false) or not url(p.githubUrl,false) or not url(p.evidenceUrl,false)) return false;
    if (p.status!="draft" and p.status!="published") return false;
    if (p.relationship!="unverified" and p.relationship!="protocol" and p.relationship!="dfinity" and p.relationship!="ecosystem") return false;
    if (p.relationship!="unverified" and p.evidenceUrl=="") return false;
    for (tag in p.tags.vals()) { if (tag.size() > 80) return false };
    for (c in p.canisters.vals()) { if (c.canisterId.size() > 80 or c.role.size() > 50) return false };
    for (s in p.sources.vals()) { if (s.sourceType.size() > 50 or s.collectedAt.size() > 50 or not url(s.sourceUrl,true)) return false };
    true
  };
  func user(who : Principal) : UserData {
    switch (Array.find<(Principal,UserData)>(users,func(entry) { entry.0 == who })) { case (?entry) entry.1; case null { {profile=defaultProfile;favorites=[]} } }
  };
  func putUser(who : Principal, data : UserData) {
    let present = Array.find<(Principal,UserData)>(users,func(entry) { entry.0 == who }) != null;
    if (present) { users := Array.map<(Principal,UserData),(Principal,UserData)>(users,func(entry) { if(entry.0==who) (who,data) else entry }) }
    else { assert users.size() < 10000; users := Array.append(users,[(who,data)]) }
  };
  func upsert(p : Project) {
    let value : Project = { p with updatedAt=Int.toText(Time.now()) };
    if (Array.find<Project>(projects,func(item) {item.id==p.id}) != null) {
      projects := Array.map<Project,Project>(projects,func(item) {if(item.id==p.id) value else item})
    } else { assert projects.size() < 10000;projects:=Array.append(projects,[value]) }
  };
  public query func health() : async Text { "catalog-icp-v1" };
  public shared query ({caller}) func whoami() : async Principal { caller };
  public shared query ({caller}) func is_administrator() : async Bool { admin(caller) };
  public shared query ({caller}) func administrator_session() : async {authenticated : Bool; writesEnabled : Bool} {
    {authenticated=admin(caller);writesEnabled=admin(caller)}
  };
  public shared ({caller}) func set_administrator(who : Principal, enabled : Bool) : async Result<()>  {
    if(not Prim.isController(caller) or Principal.isAnonymous(who)) return #err("Controller authorization required");
    administrators := Array.filter<Principal>(administrators,func(p) {p!=who});
    if(enabled) administrators:=Array.append(administrators,[who]);#ok(())
  };
  public shared ({caller}) func set_importer(who : Principal, enabled : Bool) : async Result<()>  {
    if(not Prim.isController(caller) or Principal.isAnonymous(who)) return #err("Controller authorization required");
    importers:=Array.filter<Principal>(importers,func(p) {p!=who});
    if(enabled) importers:=Array.append(importers,[who]);#ok(())
  };
  public query func search(term : Text, category : Text, offset : Nat, requested : Nat) : async {records : [Project];count : Nat} {
    let q=lower(term);let limit=Nat.min(30,requested);
    let found=Array.filter<Project>(projects,func(p) {p.status=="published" and (category=="" or p.category==category) and (q=="" or Text.contains(lower(p.name # " " # p.description # " " # Text.join(" ",p.tags.vals())),#text q))});
    let sorted=Array.sort<Project>(found,func(a,b) {if(a.updatedAt==b.updatedAt) Text.compare(a.id,b.id) else Text.compare(b.updatedAt,a.updatedAt)});
    let records=Array.tabulate<Project>(if(offset>=sorted.size()) 0 else Nat.min(limit,sorted.size()-offset),func(i) {sorted[offset+i]});
    {records;count=found.size()}
  };
  public shared query ({caller}) func list_admin_projects() : async Result<[Project]> {
    if(not admin(caller)) return #err("Administrator authorization required");
    #ok(Array.filter<Project>(projects,func(p) {p.source=="manual"}))
  };
  public shared ({caller}) func save_project(p : Project) : async Result<()>  {
    if(not admin(caller)) return #err("Administrator authorization required");
    if(not validProject(p) or p.source!="manual" or not Text.startsWith(p.id,#text "manual-") or p.category!="Infrastructure") return #err("Invalid manual project");
    switch(Array.find<Project>(projects,func(item){item.id==p.id})) {case (?item) {if(item.source!="manual") return #err("Project belongs to crawler")};case null{}};
    upsert(p);#ok(())
  };
  // Bounded operational deletion; callers cannot touch profiles or manual entries.
  public shared ({caller}) func delete_imported_projects(ids : [Text]) : async Result<Nat> {
    if(not Prim.isController(caller)) return #err("Controller authorization required");
    if(ids.size()==0 or ids.size() > 50) return #err("Deletion must contain 1 to 50 IDs");
    for(id in ids.vals()) {
      if(id.size()==0 or id.size() > 100) return #err("Invalid project ID");
      switch(Array.find<Project>(projects,func(p){p.id==id})) {
        case (?p) {if(p.source=="manual") return #err("Manual projects cannot be deleted by this operation")};
        case null {};
      };
    };
    let before=projects.size();
    projects:=Array.filter<Project>(projects,func(p){Array.find<Text>(ids,func(id){id==p.id})==null});
    #ok(before-projects.size())
  };
  public shared ({caller}) func import_projects(batch : [Project]) : async Result<Nat> {
    if(not includes(importers,caller) and not Prim.isController(caller)) return #err("Importer authorization required");
    if(batch.size()==0 or batch.size() > 50) return #err("Import batch must contain 1 to 50 projects");
    var ids : [Text]=[];
    for(p in batch.vals()) {
      if(not validProject(p) or (p.source!="sns" and p.source!="caffeine") or p.status!="published" or p.relationship!="unverified" or Text.startsWith(p.id,#text "manual-") or p.sources.size()==0) return #err("Invalid crawler project");
      if(Array.find<Text>(ids,func(id){id==p.id})!=null) return #err("Duplicate project ID");
      ids:=Array.append(ids,[p.id]);
      switch(Array.find<Project>(projects,func(item){item.id==p.id})) {case (?item) {if(item.source=="manual") return #err("Manual projects cannot be overwritten")};case null{}};
    };
    for(p in batch.vals()) {upsert(p)};#ok(batch.size())
  };
  public shared query ({caller}) func get_my_data() : async Result<UserData> {
    if(not authenticated(caller)) return #err("Sign in required");#ok(user(caller))
  };
  public shared ({caller}) func save_my_profile(profile : Profile) : async Result<()>  {
    if(not authenticated(caller)) return #err("Sign in required");
    if(profile.name.size() > 40 or profile.bio.size() > 280 or profile.role.size() > 40 or profile.avatar.size() > 40 or profile.interests.size() > 12 or not url(profile.website,false) or not url(profile.github,false)) return #err("Invalid profile");
    for(topic in profile.interests.vals()) {if(topic.size() > 80) return #err("Invalid interest")};
    let previous=user(caller);putUser(caller,{previous with profile});#ok(())
  };
  public shared ({caller}) func save_my_favorites(favorites : [Favorite]) : async Result<()>  {
    if(not authenticated(caller)) return #err("Sign in required");
    if(favorites.size() > 300) return #err("Too many favorites");
    for(f in favorites.vals()) {if(not Text.startsWith(f.href,#text "#/app/") or f.href.size() > 180 or f.name.size() > 160 or not url(f.logo,false)) return #err("Invalid favorite")};
    let previous=user(caller);putUser(caller,{previous with favorites});#ok(())
  };
  public shared ({caller}) func delete_my_data() : async Result<()>  {
    if(not authenticated(caller)) return #err("Sign in required");
    users:=Array.filter<(Principal,UserData)>(users,func(entry){entry.0!=caller});#ok(())
  };
}
