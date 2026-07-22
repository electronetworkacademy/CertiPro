// ============================================
// ELECTRONETWORK ACADEMY - APP LOGIC
// ============================================

// Datos iniciales de demo
const DEMO_DATA = {
  companies: [
    {
      id: 'demo-company',
      name: 'Empresa Demo S.A.S.',
      adminEmail: 'electronetworkacademy@gmail.com',
      licenseTier: 10,
      licensesUsed: 2,
      licensesTotal: 10,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: null
    }
  ],
  users: [
    {
      id: 'admin-1',
      companyId: 'demo-company',
      email: 'electronetworkacademy@gmail.com',
      name: 'Administrador Demo',
      role: 'admin',
      status: 'active',
      progress: {},
      currentModule: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-1',
      companyId: 'demo-company',
      email: 'usuario1@empresa.com',
      name: 'Usuario de Prueba 1',
      role: 'learner',
      status: 'active',
      progress: {},
      currentModule: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-2',
      companyId: 'demo-company',
      email: 'usuario2@empresa.com',
      name: 'Usuario de Prueba 2',
      role: 'learner',
      status: 'pending',
      progress: {},
      currentModule: 0,
      createdAt: new Date().toISOString()
    }
  ],
  moduleProgress: []
};

// Inicializar datos si no existen
function initData() {
  if (!localStorage.getItem('ena_data')) {
    localStorage.setItem('ena_data', JSON.stringify(DEMO_DATA));
  }
  if (!localStorage.getItem('ena_session')) {
    localStorage.setItem('ena_session', JSON.stringify({ user: null }));
  }
}

// Obtener datos
function getData() {
  try {
    return JSON.parse(localStorage.getItem('ena_data')) || DEMO_DATA;
  } catch(e) {
    return DEMO_DATA;
  }
}

// Guardar datos
function saveData(data) {
  localStorage.setItem('ena_data', JSON.stringify(data));
}

// Obtener sesión
function getSession() {
  try {
    return JSON.parse(localStorage.getItem('ena_session')) || { user: null };
  } catch(e) {
    return { user: null };
  }
}

// Guardar sesión
function saveSession(session) {
  localStorage.setItem('ena_session', JSON.stringify(session));
}

// Login (compatible con index.html autónomo)
function login(email, password, role) {
  const data = getData();
  const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, message: 'Usuario no encontrado' };
  }

  if (user.role !== role) {
    return { success: false, message: 'Rol incorrecto. Cambia de pestaña.' };
  }

  if (user.status === 'pending') {
    return { success: false, message: 'Tu acceso está pendiente de activación' };
  }

  if (user.status === 'inactive') {
    return { success: false, message: 'Tu cuenta ha sido desactivada' };
  }

  saveSession({ user: user });
  return { success: true, user: user };
}

// Logout
function logout() {
  saveSession({ user: null });
  window.location.href = 'index.html';
}

// Verificar sesión
function checkAuth(requiredRole) {
  const session = getSession();
  if (!session.user) {
    window.location.href = 'index.html';
    return null;
  }
  if (requiredRole && session.user.role !== requiredRole) {
    window.location.href = 'index.html';
    return null;
  }
  return session.user;
}

// Obtener usuario actual
function getCurrentUser() {
  const session = getSession();
  return session.user;
}

// Obtener empresa del usuario
function getUserCompany() {
  const data = getData();
  const user = getCurrentUser();
  if (!user) return null;
  return data.companies.find(c => c.id === user.companyId);
}

// Agregar usuario (admin)
function addUser(email, name) {
  const data = getData();
  const currentUser = getCurrentUser();
  const company = getUserCompany();

  if (!company) return { success: false, message: 'No tienes empresa asignada' };
  if (company.licensesUsed >= company.licensesTotal) {
    return { success: false, message: 'No hay cupos disponibles' };
  }

  if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: 'Este correo ya está registrado' };
  }

  const newUser = {
    id: 'user-' + Date.now(),
    companyId: currentUser.companyId,
    email: email,
    name: name || email.split('@')[0],
    role: 'learner',
    status: 'active',
    progress: {},
    currentModule: 0,
    createdAt: new Date().toISOString()
  };

  data.users.push(newUser);
  company.licensesUsed++;

  saveData(data);
  return { success: true, user: newUser };
}

// Eliminar usuario
function removeUser(userId) {
  const data = getData();
  const company = getUserCompany();
  const userIndex = data.users.findIndex(u => u.id === userId);

  if (userIndex === -1) return { success: false, message: 'Usuario no encontrado' };

  const user = data.users[userIndex];
  if (user.role === 'admin') return { success: false, message: 'No puedes eliminar administradores' };

  data.users.splice(userIndex, 1);
  if (company) company.licensesUsed--;

  saveData(data);
  return { success: true };
}

// Obtener progreso de módulo
function getModuleProgress(userId, moduleId) {
  const data = getData();
  return data.moduleProgress.find(mp => mp.userId === userId && mp.moduleId === moduleId);
}

// Guardar progreso de módulo
function saveModuleProgress(moduleId, score, completed) {
  const data = getData();
  const user = getCurrentUser();
  if (!user) return;

  let mp = data.moduleProgress.find(m => m.userId === user.id && m.moduleId === moduleId);
  if (!mp) {
    mp = { id: 'mp-' + Date.now(), userId: user.id, moduleId: moduleId, completed: false, score: 0, timeSpentSeconds: 0, completedAt: null };
    data.moduleProgress.push(mp);
  }

  mp.score = score;
  mp.completed = completed;
  if (completed) mp.completedAt = new Date().toISOString();

  const userIndex = data.users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    data.users[userIndex].currentModule = Math.max(data.users[userIndex].currentModule, moduleId + 1);
  }

  saveData(data);

  const session = getSession();
  session.user = data.users[userIndex];
  saveSession(session);
}

// Verificar si módulo está desbloqueado
function isModuleUnlocked(moduleId) {
  const user = getCurrentUser();
  if (!user) return moduleId === 0;
  if (user.role === 'admin') return true;
  return moduleId <= user.currentModule;
}

// Verificar si módulo está completado
function isModuleCompleted(moduleId) {
  const data = getData();
  const user = getCurrentUser();
  if (!user) return false;
  return data.moduleProgress.some(mp => mp.userId === user.id && mp.moduleId === moduleId && mp.completed);
}

// Calcular progreso total
function getTotalProgress() {
  const data = getData();
  const user = getCurrentUser();
  if (!user) return 0;
  const completed = data.moduleProgress.filter(mp => mp.userId === user.id && mp.completed).length;
  return Math.round((completed / 8) * 100);
}

// Formatear fecha
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Formatear tiempo
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Exportar datos
function exportData() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'electronetwork-academy-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Importar datos
function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    saveData(data);
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Archivo inválido' };
  }
}

// Resetear datos a demo
function resetData() {
  if (confirm('¿Estás seguro? Esto borrará todos los datos y restaurará los de demostración.')) {
    localStorage.setItem('ena_data', JSON.stringify(DEMO_DATA));
    localStorage.setItem('ena_session', JSON.stringify({ user: null }));
    alert('Datos restaurados. Recarga la página.');
    window.location.href = 'index.html';
  }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', initData);
