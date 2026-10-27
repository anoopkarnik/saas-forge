import { describe, it, expect, vi } from 'vitest';
import { saveLandingFeatures } from './feature-persistence';
const details = { key:'email', groupKey:'foundation', icon:'mail', inclusion:'included', bullets:['Send verification emails'], toolGroups:[], dependencies:[] };
const old = { id:'owned', landingPageId:'page', title:'Email', description:'Old', imageUrl:'', category:'Core', details, sortOrder:0 };
function transaction(rows = [old]) {
  return { feature: { findMany:vi.fn().mockResolvedValue(rows),update:vi.fn().mockResolvedValue({}),create:vi.fn().mockResolvedValue({}),deleteMany:vi.fn().mockResolvedValue({}) } };
}
describe('feature persistence', () => {
 it('preserves structured content when an older client only edits the description', async()=>{
  const tx=transaction();
  await saveLandingFeatures(tx as never,'page',[{id:'owned',title:'Email',description:'New',imageUrl:''}]);
  expect(tx.feature.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'owned'},data:expect.objectContaining({description:'New',details,sortOrder:0})}));
  expect(tx.feature.create).not.toHaveBeenCalled();
 });
 it('rejects foreign IDs before any feature writes',async()=>{
  const tx=transaction();
  await expect(saveLandingFeatures(tx as never,'page',[{id:'foreign',title:'Email',description:'',imageUrl:''}])).rejects.toThrow(/does not belong/);
  expect(tx.feature.update).not.toHaveBeenCalled(); expect(tx.feature.deleteMany).not.toHaveBeenCalled();
 });
 it('persists submitted order while keeping existing row IDs',async()=>{
  const tx=transaction();
  await saveLandingFeatures(tx as never,'page',[{title:'New feature',description:'New',imageUrl:''},{id:'owned',title:'Email',description:'New',imageUrl:''}]);
  expect(tx.feature.create).toHaveBeenCalledWith({data:expect.objectContaining({sortOrder:0,landingPageId:'page'})});
  expect(tx.feature.update).toHaveBeenCalledWith({where:{id:'owned'},data:expect.objectContaining({sortOrder:1})});
 });
 it('rejects duplicate stable keys after merging old-client metadata',async()=>{
  const tx=transaction();
  await expect(saveLandingFeatures(tx as never,'page',[{id:'owned',title:'Email',description:'',imageUrl:''},{title:'Duplicate',description:'',imageUrl:'',details:details as never}])).rejects.toThrow(/unique/);
  expect(tx.feature.update).not.toHaveBeenCalled();
 });
 it('allows explicitly clearing structured content and deleting all items',async()=>{
  const tx=transaction();
  await saveLandingFeatures(tx as never,'page',[{id:'owned',title:'Email',description:'',imageUrl:'',details:null}]);
  expect(tx.feature.update.mock.calls[0][0].data.details).not.toEqual(details);
  await saveLandingFeatures(tx as never,'page',[]);
  expect(tx.feature.deleteMany).toHaveBeenLastCalledWith({where:{landingPageId:'page',id:{notIn:[]}}});
 });
});
