import {sharingTransition,validateOffer} from '../domain/sharing.js';
export function createSharingService(client,userId){
  function table(){if(!client||!userId)throw new Error('Sign in to use the sharing simulation.');return client.from('sharing_offers');}
  async function confirmed(query){const {data,error}=await query.select('id').single();if(error||!data)throw error??new Error('Sharing change could not be confirmed.');return data;}
  return {
    async list(){const {data,error}=await table().select('*').eq('owner_id',userId).order('created_at',{ascending:false}).limit(100);if(error)throw error;return data;},
    save(item,id=null){const values=validateOffer(item);return confirmed(id?table().update(values).eq('owner_id',userId).eq('id',id).eq('status','Available'):table().insert({...values,owner_id:userId}));},
    act(offer,action,actor){const values=sharingTransition(offer,action,actor);return confirmed(table().update(values).eq('owner_id',userId).eq('id',offer.id).eq('status',offer.status));},
    remove(offer){return confirmed(table().delete().eq('owner_id',userId).eq('id',offer.id));},
  };
}
