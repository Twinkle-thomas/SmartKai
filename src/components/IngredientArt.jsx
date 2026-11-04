export default function IngredientArt({kind='pack'}) {
  return <svg viewBox="0 0 56 56" fill="none" aria-hidden="true" className={`ingredient-art art-${kind}`}>
    <ellipse cx="28" cy="46" rx="17" ry="3" fill="#173f3220"/>
    {kind==='carrot'?<><path d="M20 18Q34 12 39 24L18 47Q12 48 14 41Z" fill="#DF8F50"/><path d="M31 20Q24 6 30 5Q37 8 35 18M35 18Q44 4 48 10Q48 17 37 22" fill="#5F874E"/><path d="M19 30L25 33M18 38L22 40" stroke="#B96C35" strokeWidth="2"/></>:
    kind==='leaf'?<><path d="M11 42Q3 17 24 15Q30 4 40 13Q56 20 40 38Q31 47 11 42Z" fill="#6E9B5B"/><path d="M15 46L36 20M25 33L16 26M29 29L40 30" stroke="#D4E5AE" strokeWidth="2.5" strokeLinecap="round"/></>:
    kind==='banana'?<><path d="M10 17Q13 45 42 27L46 33Q17 56 8 29Z" fill="#EDC66F"/><path d="M10 17L8 11M45 29L49 26" stroke="#66824C" strokeWidth="4" strokeLinecap="round"/></>:
    kind==='fruit'?<><path d="M26 17Q10 9 9 28Q9 43 24 46Q30 44 34 46Q48 39 47 25Q45 10 29 17" fill="#C87961"/><path d="M28 18L30 8" stroke="#6D6640" strokeWidth="3"/><path d="M31 12Q35 3 44 7Q39 17 31 12" fill="#5F874E"/><path d="M17 23Q13 29 16 34" stroke="#EAB49A" strokeWidth="3" strokeLinecap="round"/></>:
    kind==='egg'?<><path d="M28 7C20 7 12 26 12 33C12 51 44 51 44 33C44 26 36 7 28 7Z" fill="#E6D7B5"/><path d="M20 25Q15 36 23 39" stroke="#F9F4E7" strokeWidth="4" strokeLinecap="round"/></>:
    kind==='bottle'?<><path d="M22 11H34V18L40 25V44Q28 49 16 44V25L22 18Z" fill="#E8EBDE" stroke="#B8C8B3" strokeWidth="1.5"/><rect x="21" y="6" width="14" height="7" rx="2" fill="#567D58"/><path d="M17 28H39V39H17Z" fill="#6F965E"/><path d="M24 30Q32 28 32 34Q29 38 24 36Z" fill="#D8E9C1"/></>:
    kind==='can'||kind==='jar'?<><rect x="14" y="14" width="28" height="31" rx="5" fill={kind==='jar'?'#D7B465':'#AAC0A0'}/><ellipse cx="28" cy="14" rx="14" ry="4" fill="#D2DACA"/><rect x="14" y="24" width="28" height="13" fill="#F4EFD9"/><path d="M24 33Q19 23 33 25Q35 33 24 33" fill="#6E9054"/></>:
    kind==='bread'?<><path d="M13 24Q4 13 16 10Q27 4 41 11Q51 15 43 24V44H13Z" fill="#C79B68"/><path d="M17 25Q10 17 21 14Q30 11 39 17Q43 20 39 25V40H17Z" fill="#F0DAB0"/><circle cx="24" cy="27" r="2" fill="#D5B580"/><circle cx="33" cy="33" r="2" fill="#D5B580"/></>:
    kind==='cheese'?<><path d="M10 25L33 13L47 27V43L10 38Z" fill="#DDB75F"/><path d="M10 25L47 27L33 13Z" fill="#F0D387"/><circle cx="22" cy="32" r="3" fill="#C99D49"/><circle cx="38" cy="35" r="2" fill="#C99D49"/></>:
    kind==='onion'||kind==='potato'?<><path d="M27 12Q10 16 11 33Q12 47 29 46Q47 45 46 30Q44 15 27 12" fill={kind==='onion'?'#C9A67A':'#BAA077'}/><path d="M24 16Q15 32 25 43M31 15Q41 32 32 43" stroke="#E8CDA0" strokeWidth="2"/><path d="M27 14L29 6" stroke="#7C8B52" strokeWidth="3"/></>:
    kind==='mushroom'?<><path d="M22 26H34L38 46H18Z" fill="#D8CDB5"/><path d="M7 28Q8 7 28 8Q48 8 49 28Q29 36 7 28" fill="#A4866D"/><path d="M13 27Q27 31 43 27" stroke="#E5D9C1" strokeWidth="3"/></>:
    <><path d="M16 10H40L43 45H13Z" fill="#DCD5BA"/><path d="M16 10H40L37 17H19Z" fill="#B6B08F"/><rect x="17" y="23" width="22" height="15" rx="2" fill="#668357"/><path d="M27 34V25M26 29L22 26M28 32L33 28" stroke="#DCE8BA" strokeWidth="2"/></>}
  </svg>;
}
