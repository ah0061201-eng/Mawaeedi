
const form = document.getElementById("appointment-form");
const taskInput = document.getElementById("task");
const timeInput = document.getElementById("time");
const appointmentsContainer = document.getElementById("appointments");

const notificationButton = document.getElementById("enable-notifications");
const notificationStatus = document.getElementById("notification-status");

let appointments = JSON.parse(
  localStorage.getItem("mawaeedi-appointments") || "[]"
);

function saveAppointments() {
  localStorage.setItem(
    "mawaeedi-appointments",
    JSON.stringify(appointments)
  );
}

function renderAppointments() {
  appointmentsContainer.innerHTML = "";

  if (appointments.length === 0) {
    appointmentsContainer.textContent = "لا توجد مواعيد حتى الآن.";
    return;
  }

  appointments.forEach((appointment, index) => {
    const card = document.createElement("div");
    card.className = "appointment";

    const title = document.createElement("h3");
    title.textContent = appointment.task;

    const time = document.createElement("p");
    time.textContent = `وقت الموعد: ${appointment.time}`;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "حذف الموعد";
    deleteButton.type = "button";
    deleteButton.style.background = "#dc2626";

    deleteButton.addEventListener("click", () => {
      appointments.splice(index, 1);
      saveAppointments();
      renderAppointments();
    });

    card.append(title, time, deleteButton);
    appointmentsContainer.appendChild(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const task = taskInput.value.trim();
  const time = timeInput.value;

  if (!task || !time) return;

  appointments.push({ task, time });
  saveAppointments();
  renderAppointments();
  form.reset();
});

if (notificationButton && notificationStatus) {
  notificationButton.addEventListener("click", () => {
    notificationStatus.textContent = "جارٍ تجهيز طلب الإشعارات...";

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.Notifications.requestPermission();

        if (OneSignal.Notifications.permission) {
          notificationStatus.textContent = "تم السماح بالإشعارات.";
        } else {
          notificationStatus.textContent =
            "لم يتم السماح بالإشعارات. يمكنك تفعيلها من إعدادات الجهاز.";
        }
      } catch (error) {
        console.error("خطأ في تفعيل الإشعارات:", error);
        notificationStatus.textContent =
          "تعذّر تفعيل الإشعارات. حاول مرة أخرى.";
      }
    });
  });
}

renderAppointments();
