// Datenschicht: Supabase (live) oder Demo (demo-data.json + localStorage).
(function () {
  const cfg = window.GARAGE_CONFIG || {};
  const LIST_COLS = "id,source,url,status,eligible,severe,title,make,model,series,variant,body,engine_code,engine_group," +
    "engine_confidence,engine_note,power_hp,displacement_ccm,fuel,transmission,first_reg,year,mileage_km,price_eur,price_type,hu," +
    "seller_type,location_text,zip,dist_km,zone,images,auto_labels,exclude_reasons,score,price_history,first_seen,last_checked," +
    "deleted_at,manual,archived,legacy,updated_at,dup_of,also_on,expected_price,deal_pct,offer_score";

  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  // ---------------- Supabase ----------------
  function SupabaseStore() {
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "garage02-auth" },
    });
    const S = { mode: "live", sb, me: null, members: [] };

    S.session = async () => (await sb.auth.getSession()).data.session;
    S.signIn = async (email, password) => {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    };
    S.signOut = async () => { await sb.auth.signOut(); localStorage.removeItem("garage02-cache"); };

    S.loadMembers = async () => {
      const session = await S.session();
      const { data, error } = await sb.from("members").select("*");
      if (error) throw error;
      S.members = data || [];
      S.me = S.members.find(m => m.user_id === session.user.id) || null;
      return S.me;
    };

    async function all(table, cols, opts = {}) {
      let out = [], from = 0;
      for (;;) {
        let q = sb.from(table).select(cols).range(from, from + 999);
        if (opts.order) q = q.order(opts.order, { ascending: !!opts.asc });
        if (opts.limit) q = q.limit(opts.limit);
        const { data, error } = await q;
        if (error) throw error;
        out = out.concat(data || []);
        if (!data || data.length < 1000 || opts.limit) break;
        from += 1000;
      }
      return out;
    }

    S.loadAll = async () => {
      const [cars, ratings, labels, carLabels, comments, events, runs, impressions, dupMarks] = await Promise.all([
        all("cars", LIST_COLS),
        all("ratings", "car_id,user_id,rating,updated_at"),
        all("labels", "*", { order: "created_at", asc: true }),
        all("car_labels", "car_id,label_id,added_by,added_at"),
        all("comments", "id,car_id,user_id,body,created_at", { order: "created_at", asc: true }),
        all("events", "id,car_id,kind,old,new,at", { order: "at", limit: 400 }),
        all("job_runs", "*", { order: "finished_at", limit: 5 }),
        all("impressions", "car_id,user_id,value,at").catch(() => []),
        all("dup_marks", "car_id,dup_id,created_by,created_at").catch(() => []),   // kommt mit migration_004
      ]);
      const res = { cars, ratings, labels, carLabels, comments, events, runs, impressions, dupMarks };
      lsSet("garage02-cache", { at: Date.now(), res, me: S.me, members: S.members });
      return res;
    };
    S.cached = () => lsGet("garage02-cache", null);

    S.loadCarDetail = async (id) => {
      const { data, error } = await sb.from("cars").select("description,desc_history,features,legacy").eq("id", id).single();
      if (error) throw error;
      return data;
    };
    S.setRating = async (carId, rating) => {
      if (rating == null) {
        const { error } = await sb.from("ratings").delete().eq("car_id", carId).eq("user_id", S.me.user_id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("ratings").upsert({ car_id: carId, user_id: S.me.user_id, rating, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
    };
    // name_ar kommt mit migration_003 – ohne die Spalte wird das Label nur deutsch gespeichert
    const noArCol = (e) => e && /name_ar/.test(e.message || "");
    S.addLabel = async (name, color, name_ar) => {
      let { data, error } = await sb.from("labels").insert({ name, color, name_ar }).select().single();
      if (noArCol(error)) ({ data, error } = await sb.from("labels").insert({ name, color }).select().single());
      if (error) throw error; return data;
    };
    S.updateLabel = async (id, patch) => {
      let { error } = await sb.from("labels").update(patch).eq("id", id);
      if (noArCol(error)) { const p = Object.assign({}, patch); delete p.name_ar; ({ error } = await sb.from("labels").update(p).eq("id", id)); }
      if (error) throw error;
    };
    S.deleteLabel = async (id) => { const { error } = await sb.from("labels").delete().eq("id", id); if (error) throw error; };
    S.toggleCarLabel = async (carId, labelId, on) => {
      const q = on ? sb.from("car_labels").insert({ car_id: carId, label_id: labelId })
        : sb.from("car_labels").delete().eq("car_id", carId).eq("label_id", labelId);
      const { error } = await q; if (error) throw error;
    };
    S.addComment = async (carId, body) => {
      const { data, error } = await sb.from("comments").insert({ car_id: carId, body }).select().single();
      if (error) throw error; return data;
    };
    S.deleteComment = async (id) => { const { error } = await sb.from("comments").delete().eq("id", id); if (error) throw error; };
    S.setImpression = async (carId, value) => {
      if (value == null) {
        const { error } = await sb.from("impressions").delete().eq("car_id", carId).eq("user_id", S.me.user_id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("impressions").upsert({ car_id: carId, user_id: S.me.user_id, value, at: new Date().toISOString() });
        if (error) throw error;
      }
    };
    S.setArchived = async (carId, archived) => { const { error } = await sb.from("cars").update({ archived }).eq("id", carId); if (error) throw error; };
    S.submitLink = async (url, note) => { const { error } = await sb.from("submissions").insert({ url, note }); if (error) throw error; };
    S.listSubmissions = async () => (await sb.from("submissions").select("*").order("created_at", { ascending: false }).limit(30)).data || [];
    // Von Hand gemeldete Duplikate: car_id = Auto, bei dem gemeldet wurde, dup_id = das andere Inserat
    S.addDupMark = async (carId, dupId) => { const { error } = await sb.from("dup_marks").insert({ car_id: carId, dup_id: dupId }); if (error) throw error; };
    S.removeDupMark = async (carId, dupId) => { const { error } = await sb.from("dup_marks").delete().eq("car_id", carId).eq("dup_id", dupId); if (error) throw error; };
    S.updateMe = async (patch) => { await sb.from("members").update(patch).eq("user_id", S.me.user_id); Object.assign(S.me, patch); };

    S.subscribe = (onChange) => {
      const ch = sb.channel("garage02");
      ["ratings", "car_labels", "labels", "comments", "cars", "events", "submissions", "impressions", "dup_marks"].forEach(t =>
        ch.on("postgres_changes", { event: "*", schema: "public", table: t }, (p) => onChange(t, p)));
      ch.subscribe();
      return () => sb.removeChannel(ch);
    };
    return S;
  }

  // ---------------- Demo ----------------
  function DemoStore() {
    const params = new URLSearchParams(location.search);
    const as = params.get("as") || lsGet("demo-as", "moe");
    lsSet("demo-as", as);
    const members = [
      { user_id: "demo-moe", role: "moe", name: "Moe", can_write: true, lang: "de" },
      { user_id: "demo-mohamed", role: "mohamed", name: "Mohamed", can_write: true, lang: "de" },
      { user_id: "demo-noha", role: "noha", name: "Noha", can_write: false, lang: "ar" },
    ];
    const S = { mode: "demo", members, me: members.find(m => m.role === as) || members[0] };
    const st = lsGet("demo-state", { ratings: [], labels: [], carLabels: [], comments: [], archived: {}, subs: [], seq: 1 });
    st.impressions = st.impressions || [];
    st.dupMarks = st.dupMarks || [];
    const save = () => lsSet("demo-state", st);
    let base = null;
    S.session = async () => ({ user: { id: S.me.user_id } });
    S.signIn = async () => { };
    S.signOut = async () => { };
    S.loadMembers = async () => { const lang = lsGet("demo-lang-" + S.me.role, null); if (lang) S.me.lang = lang; return S.me; };
    S.loadAll = async () => {
      if (!base) base = await (await fetch("demo-data.json", { cache: "no-store" })).json();
      const cars = base.cars.map(c => ({ ...c, description: undefined, archived: !!st.archived[c.id] }));
      const events = (base.events || []).map((e, i) => ({ ...e, id: i + 1 }));
      return { cars, ratings: st.ratings, impressions: st.impressions, dupMarks: st.dupMarks, labels: st.labels, carLabels: st.carLabels, comments: st.comments, events,
        runs: [{ finished_at: base.exported_at, stats: {} }] };
    };
    S.cached = () => null;
    S.loadCarDetail = async (id) => { const c = base.cars.find(x => x.id === id) || {}; return { description: c.description, desc_history: c.desc_history, features: c.features, legacy: c.legacy }; };
    S.setRating = async (carId, rating) => {
      st.ratings = st.ratings.filter(r => !(r.car_id === carId && r.user_id === S.me.user_id));
      if (rating != null) st.ratings.push({ car_id: carId, user_id: S.me.user_id, rating, updated_at: new Date().toISOString() });
      save();
    };
    S.addLabel = async (name, color, name_ar) => { const l = { id: st.seq++, name, name_ar, color, created_by: S.me.user_id, created_at: new Date().toISOString() }; st.labels.push(l); save(); return l; };
    S.updateLabel = async (id, patch) => { Object.assign(st.labels.find(l => l.id === id), patch); save(); };
    S.deleteLabel = async (id) => { st.labels = st.labels.filter(l => l.id !== id); st.carLabels = st.carLabels.filter(x => x.label_id !== id); save(); };
    S.toggleCarLabel = async (carId, labelId, on) => {
      st.carLabels = st.carLabels.filter(x => !(x.car_id === carId && x.label_id === labelId));
      if (on) st.carLabels.push({ car_id: carId, label_id: labelId, added_by: S.me.user_id, added_at: new Date().toISOString() });
      save();
    };
    S.addComment = async (carId, body) => { const c = { id: st.seq++, car_id: carId, user_id: S.me.user_id, body, created_at: new Date().toISOString() }; st.comments.push(c); save(); return c; };
    S.deleteComment = async (id) => { st.comments = st.comments.filter(c => c.id !== id); save(); };
    S.setArchived = async (carId, a) => { st.archived[carId] = a; save(); };
    S.setImpression = async (carId, value) => {
      st.impressions = st.impressions.filter(r => !(r.car_id === carId && r.user_id === S.me.user_id));
      if (value != null) st.impressions.push({ car_id: carId, user_id: S.me.user_id, value, at: new Date().toISOString() });
      save();
    };
    S.submitLink = async (url, note) => { st.subs.unshift({ id: st.seq++, url, note, status: "pending", created_at: new Date().toISOString() }); save(); };
    S.listSubmissions = async () => st.subs;
    S.addDupMark = async (carId, dupId) => { st.dupMarks.push({ car_id: carId, dup_id: dupId, created_by: S.me.user_id, created_at: new Date().toISOString() }); save(); };
    S.removeDupMark = async (carId, dupId) => { st.dupMarks = st.dupMarks.filter(m => !(m.car_id === carId && m.dup_id === dupId)); save(); };
    S.updateMe = async (patch) => { Object.assign(S.me, patch); if (patch.lang) lsSet("demo-lang-" + S.me.role, patch.lang); };
    S.subscribe = () => () => { };
    return S;
  }

  const forceDemo = new URLSearchParams(location.search).has("demo");
  window.Store = (cfg.supabaseUrl && cfg.supabaseAnonKey && !forceDemo) ? SupabaseStore() : DemoStore();
})();
