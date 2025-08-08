// Save as chat-handler.js
// Simple usage: include in index.html after aiConfig is loaded
(function(){
  window._aiConfig = null;
  window._usedIndexes = {}; // per role+category track

  // call this after ai-config.json is fetched
  window.initChatHandler = function(aiConfig){
    window._aiConfig = aiConfig;
    // setup used index sets per role per category
    for (const role in aiConfig.roles) {
      window._usedIndexes[role] = {};
      const t = aiConfig.roles[role].templates;
      if (!t) continue;
      // templates may be object with categories or an array
      if (Array.isArray(t)) {
        window._usedIndexes[role]['__flat'] = new Set();
      } else {
        for (const cat in t) {
          if (Array.isArray(t[cat])) window._usedIndexes[role][cat] = new Set();
          else if (typeof t[cat] === 'object') {
            // e.g., situational object
            for (const sub in t[cat]) {
              if (Array.isArray(t[cat][sub])) window._usedIndexes[role][`${cat}.${sub}`] = new Set();
            }
          }
        }
      }
    }
    console.log('Chat handler initialized for roles:', Object.keys(aiConfig.roles));
  };

  function pickUniqueFromSet(arr, usedSet) {
    if (!arr || arr.length === 0) return null;
    if (usedSet.size >= arr.length) usedSet.clear(); // allow reuse after full cycle
    // try random picks a few times then fallback linear
    for (let i=0;i<8;i++){
      const idx = Math.floor(Math.random()*arr.length);
      if (!usedSet.has(idx)) { usedSet.add(idx); return arr[idx]; }
    }
    for (let i=0;i<arr.length;i++){
      if (!usedSet.has(i)){ usedSet.add(i); return arr[i]; }
    }
    return arr[Math.floor(Math.random()*arr.length)];
  }

  // keyword-driven category decision (role-aware)
  function decideCategory(role, message) {
    const msg = (message||'').toLowerCase();
    // quick mapping
    if (/^(hi|hello|hey|namaste|hlo)\b/.test(msg)) return {type:'greeting', cat:'romantic'}; // greeting -> romantic/greeting if available
    if (/(ghumne|travel|trip|ghumne chale|chale|out|walk|trip)/.test(msg)) return {type:'travel', cat:'travel'}; // travel
    if (/(khana|khana ban|khaana|khana bana)/.test(msg)) return {type:'food', cat:'caring'}; // food
    if (/(school|exam|interview|job|kaam|padhai|study|nervous)/.test(msg)) return {type:'work', cat:'motivational'};
    if (/(joke|meme|funny|lol|haso|hahaha)/.test(msg)) return {type:'fun', cat:'funny'};
    if (/(yes|haan|ha|of course|zaroor|sure)/.test(msg)) return {type:'yesno', cat:'yes'};
    if (/(no|nah|nahi|nai)/.test(msg)) return {type:'yesno', cat:'no'};
    if (/(good night|goodnight|night|raat)/.test(msg)) return {type:'time', cat:'situational.night'};
    if (/(good morning|subah|morning)/.test(msg)) return {type:'time', cat:'situational.morning'};
    // default fallback, bias romantic for main roles
    if (['girlfriend','boyfriend','wife','husband'].includes(role)) return {type:'default', cat:'romantic'};
    return {type:'default', cat:'caring'};
  }

  // main API: get reply
  window.getAIReply = function(role, message) {
    if (!window._aiConfig || !window._aiConfig.roles) return "AI config not loaded";
    role = String(role||'').toLowerCase();
    const roleBlock = window._aiConfig.roles[role];
    if (!roleBlock) return "Unknown role";

    const templates = roleBlock.templates;
    if (!templates) return "No templates for role";

    const dec = decideCategory(role, message);
    // handle travel specially: many configs may not have travel category; we'll use travel_yes/travel_no inference
    if (dec.type === 'travel') {
      // choose friendly yes/no line based on role persona and random
      const want = Math.random() > 0.35; // 65% yes by default
      if (want) {
        // prefer travel_yes if present else romantic/caring
        if (templates.travel_yes && templates.travel_yes.length) return pickUniqueFromSet(templates.travel_yes, window._usedIndexes[role].travel_yes || (window._usedIndexes[role].travel_yes = new Set()));
        if (templates.romantic && templates.romantic.length) return pickUniqueFromSet(templates.romantic, window._usedIndexes[role].romantic);
        if (templates.caring && templates.caring.length) return pickUniqueFromSet(templates.caring, window._usedIndexes[role].caring);
      } else {
        if (templates.travel_no && templates.travel_no.length) return pickUniqueFromSet(templates.travel_no, window._usedIndexes[role].travel_no || (window._usedIndexes[role].travel_no = new Set()));
        // fallback polite no
        if (templates.caring && templates.caring.length) return pickUniqueFromSet(templates.caring, window._usedIndexes[role].caring);
      }
    }

    // situational subcategories
    if (dec.cat && dec.cat.startsWith('situational.')) {
      const parts = dec.cat.split('.');
      if (templates.situational && templates.situational[parts[1]] && templates.situational[parts[1]].length) {
        return pickUniqueFromSet(templates.situational[parts[1]], window._usedIndexes[role][`situational.${parts[1]}`] || (window._usedIndexes[role][`situational.${parts[1]}`] = new Set()));
      }
    }

    // direct category
    const cat = dec.cat;
    if (cat && templates[cat] && templates[cat].length) {
      // ensure usedSet exists
      if (!window._usedIndexes[role][cat]) window._usedIndexes[role][cat] = new Set();
      return pickUniqueFromSet(templates[cat], window._usedIndexes[role][cat]);
    }

    // fallback order
    const fallbackOrder = ['romantic','caring','motivational','funny','supportive','teasing'];
    for (const f of fallbackOrder) {
      if (templates[f] && templates[f].length) {
        if (!window._usedIndexes[role][f]) window._usedIndexes[role][f] = new Set();
        return pickUniqueFromSet(templates[f], window._usedIndexes[role][f]);
      }
    }

    // final fallback if templates is flat array
    if (Array.isArray(templates)) {
      if (!window._usedIndexes[role]['__flat']) window._usedIndexes[role]['__flat'] = new Set();
      return pickUniqueFromSet(templates, window._usedIndexes[role]['__flat']);
    }

    return "Hmm... I don't have a reply for that yet.";
  };

})();
