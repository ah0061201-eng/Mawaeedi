
const SUPABASE_URL = "https://gxenypllgsybkbblmyay.supabase.co";
const SUPABASE_KEY = "sb_publishable_uCLxgfac5VREiLPRPMLUeg_yfpbgYGb";
const ONESIGNAL_APP_ID = "b651cfee-cc1e-4a03-b54f-d996c3fab2a7";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const form = document.getElementById("appointment-form");
const taskInput = document.getElementById("task");
const timeInput = document.getElementById("time");
const appointmentsContainer = document.getElementById("appointments");

const notificationButton = document.getElementById("enable-notifications");
const notificationStatus = document.getElementById("notification-status");

let currentUser = null;
let appointments = [];

async function linkOneSignalUser(userId) {
  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.login(userId);
      } catch (error) {
        console.error("OneSignal login error:", error);
      }
    });
  } catch (error) {
    console.error("OneSignal setup error:", error);
  }
}

async function loadAppointments() {
  if (!currentUser) return;

  appointmentsContainer.textContent = "جارٍ تحميل مواعيدك...";

  try {
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
    "خطأ: " + (error.message || JSON.stringify(error));
  console.error("Load appointments error:", error);
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

form.addEventListener("submit", async (event) => {
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

        notificationStatus.textContent =
          "تم السماح بالإشعارات.";
      } else {
        notificationStatus.textContent =
          "لم يتم السماح بالإشعارات.";
      }
    } catch (error) {
      notificationStatus.textContent =
        "تعذّر تفعيل الإشعارات.";
      console.error("Notification error:", error);
    }
  });
});

async function initialize() {
  appointmentsContainer.textContent = "جارٍ تجهيز مواعيدك...";

  try {
    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError) throw sessionError;

    let user = sessionData.session?.user;

    if (!user) {
      const { data, error } = await db.auth.signInAnonymously();

      if (error) throw error;

      user = data.user;
    }

    if (!user) {
      throw new Error("لم يتم إنشاء جلسة مستخدم.");
    }

    currentUser = user;

    // تحميل المواعيد دون انتظار OneSignal
    await loadAppointments();

    // ربط المستخدم بالإشعارات بشكل منفصل
    linkOneSignalUser(currentUser.id);
  } catch (error) {
    console.error("Initialization error:", error);

    appointmentsContainer.textContent =
      "تعذّر تشغيل التطبيق. تحقق من اتصال الإنترنت وإعدادات Supabase.";
  }
}

initialize();
