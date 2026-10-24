
const SUPABASE_URL = "https://gxenypllgsybkbblmyay.supabase.co";
const SUPABASE_KEY = "sb_publishable_uCLxgfac5VREiLPRPMLUeg_yfpbgYGb";
const ONESIGNAL_APP_ID = "b651cfee-cc1e-4a03-b54f-d996c3fab2a7";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("appointment-form");
const taskInput = document.getElementById("task");
const timeInput = document.getElementById("time");
const appointmentsContainer = document.getElementById("appointments");
const notificationButton = document.getElementById("enable-notifications");
const notificationStatus = document.getElementById("notification-status");

let currentUser = null;
let appointments = [];

async function linkOneSignalUser(userId) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];

  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.login(userId);
    } catch (error) {
      console.error("OneSignal login error:", error);
    }
  });
}

async function loadAppointments() {
  if (!currentUser) return;

  appointmentsContainer.textContent = "جارٍ تحميل مواعيدك...";

  try {
    appointmentsContainer.textContent = "جارٍ الاتصال بقاعدة البيانات...";
    const { data, error } = await db
      .from("appointments")
      .select("id, task, appointment_time")
      .eq("owner_id", currentUser.id)
      .order("appointment_time", { ascending: true });

    if (error) throw error;

    appointments = data || [];
    renderAppointments();
  } catch (error) {
    appointmentsContainer.textContent =
      "تعذّر تحميل المواعيد: " +
      (error.message || JSON.stringify(error));

    console.error("Load appointments error:", error);
  }
}

function renderAppointments() {
  appointmentsContainer.replaceChildren();

  if (!currentUser) {
    appointmentsContainer.textContent = "جارٍ تجهيز مواعيدك...";
    return;
  }

  if (appointments.length === 0) {
    appointmentsContainer.textContent = "لا توجد مواعيد حتى الآن.";
    return;
  }

  for (const appointment of appointments) {
    const card = document.createElement("div");
    card.className = "appointment";

    const title = document.createElement("h3");
    title.textContent = appointment.task;

    const time = document.createElement("p");
    time.textContent = `وقت الموعد: ${new Date(
      appointment.appointment_time
    ).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Riyadh"
    })}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "حذف الموعد";
    deleteButton.style.background = "#dc2626";

    deleteButton.addEventListener("click", async () => {
      deleteButton.disabled = true;

      try {
        const { error } = await db
          .from("appointments")
          .delete()
          .eq("id", appointment.id)
          .eq("owner_id", currentUser.id);

        if (error) throw error;

        await loadAppointments();
      } catch (error) {
        alert("تعذّر حذف الموعد.");
        console.error("Delete appointment error:", error);
        deleteButton.disabled = false;
      }
    });

    card.append(title, time, deleteButton);
    appointmentsContainer.append(card);
  }
}

if (form) form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("انتظر حتى يجهز التطبيق.");
    return;
  }

  const task = taskInput.value.trim();
  const time = timeInput.value;

  if (!task || !time) {
    alert("أدخل اسم المهمة ووقتها.");
    return;
  }

  const [hours, minutes] = time.split(":").map(Number);
  const appointmentDate = new Date();
  appointmentDate.setHours(hours, minutes, 0, 0);

  if (appointmentDate <= new Date()) {
    alert("اختر وقتًا لاحقًا اليوم.");
    return;
  }

  const saveButton = form.querySelector('button[type="submit"]');
  if (saveButton) saveButton.disabled = true;

  try {
    const { error } = await db.from("appointments").insert({
      task,
      appointment_time: appointmentDate.toISOString(),
      owner_id: currentUser.id
    });

    if (error) throw error;

    form.reset();
    await loadAppointments();
  } catch (error) {
    alert("تعذّر حفظ الموعد.");
    console.error("Save appointment error:", error);
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
});

notificationButton.addEventListener("click", () => {
  notificationStatus.textContent = "جارٍ تفعيل الإشعارات...";

  window.OneSignalDeferred = window.OneSignalDeferred || [];

  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.Notifications.requestPermission();

      if (OneSignal.Notifications.permission) {
        if (currentUser) {
          await OneSignal.login(currentUser.id);
        }

        notificationStatus.textContent = "تم السماح بالإشعارات.";
      } else {
        notificationStatus.textContent = "لم يتم السماح بالإشعارات.";
      }
    } catch (error) {
      notificationStatus.textContent = "تعذّر تفعيل الإشعارات.";
      console.error("Notification error:", error);
    }
  });
});


const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const loginButton = document.getElementById("login-button");
const signupButton = document.getElementById("signup-button");
const logoutButton = document.getElementById("logout-button");
const authStatus = document.getElementById("auth-status");

function updateAuthUI() {
  const loggedIn = Boolean(currentUser);

  authEmail.disabled = loggedIn;
  authPassword.disabled = loggedIn;
  loginButton.hidden = loggedIn;
  signupButton.hidden = loggedIn;
  logoutButton.hidden = !loggedIn;

  authStatus.textContent = loggedIn
    ? "تم تسجيل الدخول."
    : "سجّل الدخول أو أنشئ حسابًا جديدًا.";

  if (!loggedIn) {
    appointments = [];
    appointmentsContainer.textContent = "سجّل الدخول لعرض مواعيدك.";
  }
}

async function finishLogin(user) {
  currentUser = user;
  updateAuthUI();
  await loadAppointments();
  linkOneSignalUser(user.id);
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "جارٍ تسجيل الدخول...";
  loginButton.disabled = true;

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: authEmail.value.trim(),
      password: authPassword.value
    });

    if (error) throw error;

    await finishLogin(data.user);
  } catch (error) {
    authStatus.textContent = "تعذّر تسجيل الدخول: " + error.message;
  } finally {
    loginButton.disabled = false;
  }
});

signupButton.addEventListener("click", async () => {
  authStatus.textContent = "جارٍ إنشاء الحساب...";
  signupButton.disabled = true;

  try {
    const { data, error } = await db.auth.signUp({
      email: authEmail.value.trim(),
      password: authPassword.value
    });

    if (error) throw error;

    if (data.session && data.user) {
      await finishLogin(data.user);
    } else {
      authStatus.textContent =
        "تم إنشاء الحساب. افتح بريدك الإلكتروني لتأكيده، ثم سجّل الدخول.";
    }
  } catch (error) {
    authStatus.textContent = "تعذّر إنشاء الحساب: " + error.message;
  } finally {
    signupButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    const { error } = await db.auth.signOut();
    if (error) throw error;

    currentUser = null;
    updateAuthUI();
  } catch (error) {
    authStatus.textContent = "تعذّر تسجيل الخروج: " + error.message;
  } finally {
    logoutButton.disabled = false;
  }
});

async function initialize() {
  appointmentsContainer.textContent = "سجّل الدخول لعرض مواعيدك.";

  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    const user = data.session?.user;

    if (user && !user.is_anonymous) {
      await finishLogin(user);
    } else {
      if (user?.is_anonymous) {
        await db.auth.signOut();
      }

      currentUser = null;
      updateAuthUI();
    }
  } catch (error) {
    authStatus.textContent = "تعذّر تجهيز تسجيل الدخول: " + error.message;
  }
}

initialize();
