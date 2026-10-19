(() => {
  'use strict';
  const SAVE_KEY = 'drgCityMiniSaveV2';
  const gate = document.getElementById('knightAuthGate');
  const form = document.getElementById('knightAuthForm');
  const emailInput = document.getElementById('knightAuthEmail');
  const passwordInput = document.getElementById('knightAuthPassword');
  const message = document.getElementById('knightAuthMessage');
  const signInButton = document.getElementById('knightSignIn');
  const signUpButton = document.getElementById('knightSignUp');
  const localPlayButton = document.getElementById('knightLocalPlay');
  const choice = document.getElementById('knightSaveChoice');
  const badge = document.getElementById('knightAccountBadge');
  const emailLabel = document.getElementById('knightAccountEmail');
  let supabase = null;
  let currentUser = null;
  let cloudReady = false;
  let pendingSave = null;
  let saveTimer = null;
  let lastCloudWrite = 0;
  let writeInProgress = false;

  window.__accountReady = false;
  const setMessage = (text) => { message.textContent = text; };
  const setBusy = (busy) => {
    signInButton.disabled = busy; signUpButton.disabled = busy;
    emailInput.disabled = busy; passwordInput.disabled = busy;
  };
  const showGate = () => { gate.style.display = 'flex'; window.__accountReady = false; };
  const showGame = () => { gate.style.display = 'none'; window.__accountReady = true; };
  const validSave = (data) => !!(data && data.version === 2 && data.player && typeof data.player === 'object');
  const readLocalSave = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return validSave(data) ? data : null;
    } catch (_) { return null; }
  };
  const setAccountBadge = (user) => {
    currentUser = user || null;
    if (user) {
      emailLabel.textContent = user.email || 'Tài khoản KNIGHT';
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  };
  const saveToCloud = async (data) => {
    if (!supabase || !currentUser || !validSave(data)) throw new Error('Chưa đăng nhập hoặc dữ liệu game không hợp lệ.');
    const { error } = await supabase.from('game_saves').upsert({
      user_id: currentUser.id,
      save_data: data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) throw error;
    lastCloudWrite = Date.now();
  };
  const flushCloudSave = async () => {
    if (!cloudReady || !pendingSave || writeInProgress || !currentUser) return;
    const wait = Math.max(0, 10000 - (Date.now() - lastCloudWrite));
    if (wait > 0) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flushCloudSave, wait);
      return;
    }
    const data = pendingSave;
    pendingSave = null;
    writeInProgress = true;
    try {
      await saveToCloud(data);
      setMessage('Đã đồng bộ nhân vật lên tài khoản.');
    } catch (err) {
      pendingSave = data;
      setMessage('Chưa đồng bộ được lên máy chủ. Dữ liệu vẫn được lưu trên thiết bị. Kiểm tra cấu hình Supabase và kết nối mạng.');
      console.error('[KNIGHT cloud save]', err);
    } finally {
      writeInProgress = false;
      if (pendingSave && cloudReady) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(flushCloudSave, 1200);
      }
    }
  };
  window.knightCloudQueueSave = (data) => {
    if (!cloudReady || !currentUser || !validSave(data)) return;
    try { pendingSave = JSON.parse(JSON.stringify(data)); } catch (_) { return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushCloudSave, 1200);
  };
  const adoptCloudSave = (data) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    sessionStorage.setItem('knightCloudLoadedUserId', currentUser.id);
    location.reload();
  };
  const finishLocalSession = async (user, data) => {
    setAccountBadge(user);
    cloudReady = true;
    showGame();
    if (data) window.knightCloudQueueSave(data);
    setMessage('Đã đăng nhập. Nhân vật sẽ tự đồng bộ định kỳ.');
  };
  const chooseSave = (localData, cloudData) => {
    choice.style.display = 'block';
    setMessage('Đăng nhập thành công. Có hai bản lưu khác nhau; hãy chọn bản muốn sử dụng.');
    document.getElementById('knightUseCloud').onclick = () => adoptCloudSave(cloudData);
    document.getElementById('knightUseLocal').onclick = async () => {
      try {
        setMessage('Đang tải dữ liệu trên thiết bị lên tài khoản...');
        await saveToCloud(localData);
        choice.style.display = 'none';
        await finishLocalSession(currentUser, localData);
      } catch (err) {
        setMessage('Không thể tải dữ liệu lên. Kiểm tra bảng game_saves và chính sách bảo mật Supabase.');
        console.error('[KNIGHT migrate local]', err);
      }
    };
  };
  const startSession = async (user) => {
    setBusy(true);
    setMessage('Đang tải dữ liệu nhân vật...');
    const marker = sessionStorage.getItem('knightCloudLoadedUserId');
    if (marker && marker === user.id) {
      sessionStorage.removeItem('knightCloudLoadedUserId');
      await finishLocalSession(user, readLocalSave());
      setBusy(false);
      return;
    }
    try {
      const { data: row, error } = await supabase.from('game_saves')
        .select('save_data,updated_at').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      const localData = readLocalSave();
      const cloudData = row && validSave(row.save_data) ? row.save_data : null;
      choice.style.display = 'none';
      if (localData && cloudData) {
        setAccountBadge(user);
        chooseSave(localData, cloudData);
        setBusy(false);
        return;
      }
      if (cloudData) {
        adoptCloudSave(cloudData);
        return;
      }
      if (localData) {
        await saveToCloud(localData);
        await finishLocalSession(user, localData);
        setMessage('Đã chuyển dữ liệu cũ trên thiết bị lên tài khoản. Tiến trình game được giữ nguyên.');
        setBusy(false);
        return;
      }
      await finishLocalSession(user, null);
      setTimeout(() => window.knightCloudQueueSave(readLocalSave()), 1500);
      setBusy(false);
    } catch (err) {
      setMessage('Không thể tải/lưu dữ liệu trực tuyến. Bạn vẫn có thể chơi bằng dữ liệu trên thiết bị. Hãy kiểm tra cấu hình và chạy tệp SQL trong hướng dẫn.');
      console.error('[KNIGHT account init]', err);
      setBusy(false);
    }
  };
  const signIn = async () => {
    if (!supabase) return setMessage('Chưa cấu hình dịch vụ tài khoản. Hãy làm theo ACCOUNT_SETUP.md hoặc chọn chơi cục bộ.');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || password.length < 8) return setMessage('Nhập email hợp lệ và mật khẩu ít nhất 8 ký tự.');
    setBusy(true); setMessage('Đang đăng nhập...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session || !data.user) throw new Error('Chưa có phiên đăng nhập. Nếu vừa đăng ký, hãy xác nhận email rồi đăng nhập.');
      await startSession(data.user);
    } catch (err) {
      setMessage(err.message || 'Đăng nhập thất bại.');
      setBusy(false);
    }
  };
  const signUp = async () => {
    if (!supabase) return setMessage('Chưa cấu hình dịch vụ tài khoản. Hãy làm theo ACCOUNT_SETUP.md hoặc chọn chơi cục bộ.');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || password.length < 8) return setMessage('Nhập email hợp lệ và mật khẩu ít nhất 8 ký tự.');
    setBusy(true); setMessage('Đang tạo tài khoản...');
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: location.origin + location.pathname }
      });
      if (error) throw error;
      if (data.session && data.user) {
        await startSession(data.user);
      } else {
        setMessage('Đã gửi email xác nhận (nếu dự án bật xác nhận email). Hãy mở thư, xác nhận tài khoản rồi quay lại đăng nhập.');
        setBusy(false);
      }
    } catch (err) {
      setMessage(err.message || 'Tạo tài khoản thất bại.');
      setBusy(false);
    }
  };

  form.addEventListener('submit', (event) => { event.preventDefault(); signIn(); });
  signUpButton.addEventListener('click', signUp);
  localPlayButton.addEventListener('click', () => {
    cloudReady = false;
    setAccountBadge(null);
    choice.style.display = 'none';
    showGame();
  });
  document.getElementById('knightSyncNow').addEventListener('click', async () => {
    if (!currentUser) return setMessage('Bạn đang chơi cục bộ, chưa đăng nhập tài khoản.');
    const data = readLocalSave();
    if (!data) return setMessage('Chưa có dữ liệu lưu để đồng bộ.');
    try {
      setMessage('Đang đồng bộ...');
      await saveToCloud(data);
      setMessage('Đồng bộ thành công.');
    } catch (err) {
      setMessage('Đồng bộ thất bại. Dữ liệu cục bộ vẫn còn.');
      console.error('[KNIGHT manual sync]', err);
    }
  });
  document.getElementById('knightSignOut').addEventListener('click', async () => {
    if (supabase) await supabase.auth.signOut();
    sessionStorage.removeItem('knightCloudLoadedUserId');
    location.reload();
  });

  const url = window.KNIGHT_SUPABASE_URL;
  const key = window.KNIGHT_SUPABASE_ANON_KEY;
  if (!window.supabase || !url || !key || url.includes('YOUR_PROJECT') || key.includes('YOUR_SUPABASE')) {
    setMessage('Chưa cấu hình Supabase. Hãy tạo dự án, chạy supabase/schema.sql, điền URL và khóa công khai vào supabase-config.js. Hiện tại có thể chọn chơi cục bộ.');
    return;
  }
  try {
    supabase = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  } catch (err) {
    setMessage('Cấu hình Supabase không hợp lệ: ' + (err.message || 'không thể khởi tạo'));
    return;
  }
  (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session && data.session.user) await startSession(data.session.user);
      else { setMessage('Đăng nhập để đồng bộ tiến trình, hoặc chọn chơi cục bộ trên thiết bị này.'); setBusy(false); }
    } catch (err) {
      setMessage('Không kiểm tra được phiên đăng nhập. Bạn có thể chơi cục bộ hoặc thử tải lại trang.');
      setBusy(false);
      console.error('[KNIGHT session]', err);
    }
  })();
})();