
const SUPABASE_URL = "https://gxenypllgsybkbblmyay.supabase.co";
const SUPABASE_KEY = "sb_publishable_uCLxgfac5VREiLPRPMLUeg_yfpbgYGb";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("appointment-form");
const taskInput = document.getElementById("task");
const timeInput = document.getElementById("time");
const appointmentsContainer = document.getElementById("appointments");

const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupButton = document.getElementById("signup-button");
const logoutButton = document.getElementById("logout-button");
const authStatus = document.getElementById("auth-status");

const notificationButton = document.getElementById("enable-notifications");
const notificationStatus = document.getElementById("notification-status");

let currentUser = null;
let appointments = [];

function showAuthStatus(message) {
  if (authStatus) authStatus.textContent = message;
}

function updatePageAccess() {
  const loggedIn = Boolean(currentUser);

  form.hidden = !loggedIn;
  if (authForm) {
    authForm.querySelector('button[type="submit"]').hidden = loggedIn;
    signupButton.hidden = loggedIn;
    logoutButton.hidden = !loggedIn;
    emailInput.disabled = loggedIn;
    passwordInput.disabled = loggedIn;
  }

  if (!loggedIn) {
    appointments = [];
    renderAppointments();
    appointmentsContainer.textContent = "سجّل الدخول لعرض مواعيدك.";
  }
}

async function loadAppointments() {
  if (!currentUser) return;

  const { data, error } = await db
    .from("appointments")
    .select("id, task, appointment_time")
    .eq("owner_id", currentUser.id)
    .order("appointment_time", { ascending: true });

  if (error) {
    appointmentsContainer.textContent = "تعذّر تحميل المواعيد.";
    console.error(error);
    return;
  }

  appointments = data || [];
  renderAppointments();
}

function renderAppointments() {
  appointmentsContainer.replaceChildren();

  if (!currentUser) {
    appointmentsContainer.textContent = "سجّل الدخول لعرض مواعيدك.";
    return;
  }

  if (appointments.length === 0) {
    appointmentsContainer.textContent = "لا توجد مواعيد حتى الآن.";
    return;
  }

  appointments.forEach((appointment) => {
    const card = document.createElement("div");
    card.className = "appointment";

    const title = document.createElement("h3");
    title.textContent = appointment.task;

    const time = document.createElement("p");
    time.textContent = `وقت الموعد: ${new Date(
      appointment.appointment_time
    ).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "حذف الموعد";
    deleteButton.style.background = "#dc2626";

    deleteButton.addEventListener("click", async () => {
      const { error } = await db
        .from("appointments")
        .delete()
        .eq("id", appointment.id)
        .eq("owner_id", currentUser.id);

      if (error) {
        alert("تعذّر حذف الموعد.");
        console.error(error);
        return;
      }

      await loadAppointments();
    });

    card.append(title, time, deleteButton);
    appointmentsContainer.append(card);
  });
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showAuthStatus("تعذّر تسجيل الدخول: " + error.message);
    return;
  }

  currentUser = data.user;
  showAuthStatus("تم تسجيل الدخول بنجاح.");
  updatePageAccess();
  await loadAppointments();
});

signupButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || password.length < 6) {
    showAuthStatus("أدخل البريد وكلمة مرور من 6 أحرف على الأقل.");
    return;
  }

  const { data, error } = await db.auth.signUp({ email, password });

  if (error) {
    showAuthStatus("تعذّر إنشاء الحساب: " + error.message);
    return;
  }

  if (!data.session) {
    showAuthStatus("تحقّق من بريدك الإلكتروني لتأكيد الحساب، ثم سجّل الدخول.");
    return;
  }

  currentUser = data.user;
  showAuthStatus("تم إنشاء الحساب.");
  updatePageAccess();
  await loadAppointments();
});

logoutButton.addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    showAuthStatus("تعذّر تسجيل الخروج.");
    return;
  }

  currentUser = null;
  updatePageAccess();
  showAuthStatus("تم تسجيل الخروج.");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("سجّل الدخول أولًا.");
    return;
  }

  const task = taskInput.value.trim();
  const time = timeInput.value;

  if (!task || !time) return;

  const [hours, minutes] = time.split(":").map(Number);
  const appointmentDate = new Date();
  appointmentDate.setHours(hours, minutes, 0, 0);

  if (appointmentDate <= new Date()) {
    alert("اختر وقتًا لاحقًا اليوم.");
    return;
  }

  const { error } = await db.from("appointments").insert({
    task,
    appointment_time: appointmentDate.toISOString(),
    owner_id: currentUser.id
  });

  if (error) {
    alert("تعذّر حفظ الموعد. تأكد من إعداد صلاحيات قاعدة البيانات.");
    console.error(error);
    return;
  }

  form.reset();
  await loadAppointments();
});

notificationButton.addEventListener("click", () => {
  window.OneSignalDeferred = window.OneSignalDeferred || [];

  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.Notifications.requestPermission();

      notificationStatus.textContent =
        OneSignal.Notifications.permission
          ? "تم السماح بالإشعارات."
          : "لم يتم السماح بالإشعارات.";
    } catch (error) {
      notificationStatus.textContent = "تعذّر تفعيل الإشعارات.";
      console.error(error);
    }
  });
});

async function initialize() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    showAuthStatus("تعذّر التحقق من تسجيل الدخول.");
    return;
  }

  currentUser = data.session?.user ?? null;
  updatePageAccess();

  if (currentUser) {
    showAuthStatus("أنت مسجّل الدخول.");
    await loadAppointments();
  }
}

initialize();
