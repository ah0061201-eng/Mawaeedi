
const SUPABASE_URL = "https://gxenypllgsybkbblmyay.supabase.co";
const SUPABASE_KEY = "sb_publishable_uCLxgfac5VREiLPRPMLUeg_yfpbgYGb";

const form = document.getElementById("appointment-form");
const taskInput = document.getElementById("task");
const timeInput = document.getElementById("time");
const appointmentsContainer = document.getElementById("appointments");
const notificationButton = document.getElementById("enable-notifications");
const notificationStatus = document.getElementById("notification-status");

let appointments = [];

async function dbRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.status === 204 ? null : response.json();
}

async function loadAppointments() {
  try {
    appointments = await dbRequest(
      "appointments?select=id,task,appointment_time&order=appointment_time.asc"
    );
    renderAppointments();
  } catch (error) {
    appointmentsContainer.textContent =
      "تعذّر تحميل المواعيد. يلزم ضبط صلاحيات Supabase أولًا.";
    console.error(error);
  }
}

function renderAppointments() {
  appointmentsContainer.replaceChildren();

  if (!appointments.length) {
    appointmentsContainer.textContent = "لا توجد مواعيد حتى الآن.";
    return;
  }

  appointments.forEach((appointment) => {
    const card = document.createElement("div");
    card.className = "appointment";

    const title = document.createElement("h3");
    title.textContent = appointment.task;

    const time = document.createElement("p");
    time.textContent = `وقت الموعد: ${
      new Date(appointment.appointment_time).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit"
      })
    }`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "حذف الموعد";

    deleteButton.addEventListener("click", async () => {
      try {
        await dbRequest(`appointments?id=eq.${appointment.id}`, {
          method: "DELETE"
        });
        await loadAppointments();
      } catch (error) {
        alert("تعذّر حذف الموعد. تحقق من صلاحيات قاعدة البيانات.");
        console.error(error);
      }
    });

    card.append(title, time, deleteButton);
    appointmentsContainer.append(card);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

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

  try {
    await dbRequest("appointments", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        task,
        appointment_time: appointmentDate.toISOString()
      })
    });

    form.reset();
    await loadAppointments();
  } catch (error) {
    alert("لم يُحفظ الموعد. يلزم ضبط صلاحيات Supabase أولًا.");
    console.error(error);
  }
});

if (notificationButton && notificationStatus) {
  notificationButton.addEventListener("click", () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        notificationStatus.textContent = OneSignal.Notifications.permission
          ? "تم السماح بالإشعارات."
          : "لم يتم السماح بالإشعارات.";
      } catch {
        notificationStatus.textContent = "تعذّر تفعيل الإشعارات.";
      }
    });
  });
}

loadAppointments();
