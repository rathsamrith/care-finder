<template>
  <WebLayout>
    <div class="container-contact">
      <div class="contact-us">
        <div class="text-section">
          <h1 class="title">Contact us</h1>
          <p class="text">
            You can contact to our service and give feedback to website by use form that have in
            contect us. Contact to use for build the system and website for your bussiness.
          </p>
        </div>
        <div class="image-section">
          <img width="600px" src="../../assets/image/contact.png" alt="Contact Illustration" />
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-serves">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSG_iapAWWXQiv3oWF18K46528qui-W1Yl4X5KKOjth6boedVbnt6u8nVT_U3Uu6s9_c3U&usqp=CAU"
          class="rounded-circle"
          alt="..."
        />
        <div class="containers rounded mt5">
          <h4>Email</h4>
          <p>leysreng.ol@gmail.com</p>
        </div>
      </div>
      <div class="card-serves">
        <img src="../../assets/image/location.png" class="rounded" alt="..." />
        <div class="containers rounded mt5">
          <h4>Location</h4>
          <p>
            House No. C20-D33A, One Park, Street R8, Sangkat Srah Chak, Khan Doun Penh, Phnom Penh
          </p>
        </div>
      </div>
      <div class="card-serves">
        <img
          src="https://www.freeiconspng.com/uploads/phone-png-3.png"
          class="rounded-circle bg-white"
          alt="..."
        />
        <div class="containers rounded mt5">
          <h4>Phone Number</h4>
          <p>+855 701 9077</p>
        </div>
      </div>
    </div>
    <div class="contact">
      <h2 class="title-1">Get in Touch with us.</h2>
      <p class="text-1">
        All of these apps can be found on the Google Play Store or Apple App Store and downloaded
        for offline use.
      </p>
    </div>
    <div class="form">
      <form class="max-w-md-0 mx-auto mt-20">
        <div class="relative mb-6">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg
              class="w-4 h-4 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 16"
            >
              <path
                d="m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z"
              />
              <path
                d="M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z"
              />
            </svg>
          </div>
          <input
            type="email"
            style="font-size: 16px"
            id="email-address-icon"
            class="bg-gray-10 border border-gray-100 text-gray-500 text-sm rounded-lg focus:ring-blue-100 focus:border-blue-100 block w-full pl-10 p-2.5 h-15 dark:bg-gray-700 dark:border-gray-100 dark:placeholder-gray-100 dark:focus:ring-blue-100 dark:focus:border-blue-500"
            placeholder="Please input your email!"
          />
        </div>
        <div class="relative">
          <textarea
            id="message"
            style="font-size: 16px"
            rows="4"
            class="block p-2.5 w-full text-sm text-gray-900 bg-gray-10 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 h-55"
            placeholder="Please enter your feedback..."
          ></textarea>
        </div>
        <div class="flex justify-end mt-4">
          <button
            type="button"
            class="text-white bg-#32B4E3 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:border-blue-500 dark:hover:bg-blue-700 dark:focus:ring-blue-800 border-b border-gray-500"
          >
            Cancel
          </button>
          <button
            type="button"
            class="text-white bg-#32B4E3 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:border-blue-500 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
    <FooterLayout />
  </WebLayout>
</template>

<script setup lang="ts">
import WebLayout from '@/Components/Layouts/WebLayout.vue'
import FooterLayout from '@/Components/FooterLayout.vue'
</script>

<style scoped>
.container-contact {
  margin-bottom: 0px;
  display: flex;
  align-items: center;
  width: 100%;
  height: 80vh;
  padding: 30px;
  flex-wrap: wrap;
  /* background: #ce1b1b; */
}

.image-section img {
  width: 100%;
  height: auto;
  margin-top: 0px;
  max-width: 1000px;
  margin-bottom: 400px;
  /* background: #000; */
}

.title {
  font-size: 65px;
  font-weight: bold;
  color: #32b4e3;
  margin-top: 70px;
  margin-left: 40px;
}

.text {
  font-size: 18px;
  width: 70%;
  margin-bottom: 20px;
  text-align: justify;
  margin-left: 50px;
}

.contact-us {
  display: flex;
  flex-direction: row;
  gap: 5%;
  width: 100%;
}

.card {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
  flex-direction: row;
  margin-top: 50px;
  height: auto;
  gap: 50px;
  border: none;
  width: 100%;
  /* background: #988080; */
}

.title-1 {
  /* background: #000; */
  font-size: 50px;
  color: #32b4e3;
  justify-content: center;
  text-align: center;
  font-weight: bold;
  margin-top: 20px;
}

.text-1 {
  font-size: 15px;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* .description {
  font-size: 18px;
} */

.form {
  width: 70%;
  height: 460px;
  align-items: center;
  margin: 30px auto auto;
  padding: 10px;
  background-color: #f5f8fa;
  border-radius: 10px;
}

.el-footer {
  margin-top: 20px;
  width: 100%;
  height: 300px;
  background: rgb(255, 255, 255);
}

/* .text{
font-size: small;
}
.contact p {
  max-width: 50%;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin: auto;
} */

.containers h4 {
  justify-content: center;
  align-items: center;
  text-align: center;
  margin-top: 50px;
}

.containers {
  width: 380px;
  height: 30vh;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  box-shadow:
    0 4px 6px rgba(167, 167, 167, 0.1),
    0 2px 4px rgba(255, 255, 255, 0.06);
}

.containers:hover {
  transition:
    background 0.3s ease-in-out,
    color 0.3s ease-in-out;
  box-shadow:
    0 4px 6px rgba(167, 167, 167, 0.1),
    0 2px 4px rgba(255, 255, 255, 0.06);
  transform: translateY(-5px);
}

.card-serves img {
  display: flex;
  align-items: center;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  margin: 0 auto;
}

.subtitle {
  text-align: center;
  color: #32b4e3;
  margin-top: 20px;
}

.contact-description {
  font-size: 1.2em;
  line-height: 1.5em;
  text-align: center;
  margin: auto;
  max-width: 50%;
}

.form-input,
.form-textarea {
  font-size: 16px;
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

@media (max-width: 1440px) {
  .image-section img {
    width: 100%;
    height: auto;
  }
}

@media (max-width: 768px) {
  .container-contact {
    flex-direction: column;
    padding: 50px;
    height: 70vh;
    /* background: pink; */
  }

  .contact-us {
    /* background: rgb(44, 39, 40); */
    width: 100%;
    margin-bottom: 40px;
    gap: 50px;
    display: flex;
    flex-direction: row;
    height: 40vh;
  }

  .text-section {
    background: olivedrab;
    margin-bottom: 800px;
    margin-top: 0;
  }

  .image-section img {
    margin-top: 40px;
    width: 100%;
    height: auto;
  }

  .title {
    font-size: 20px;
  }

  .title-1 {
    font-size: 30px;
  }

  .text {
    margin-left: 5px;
    width: 185px;
    /* background: palegoldenrod; */
    font-size: 10px;
  }

  .text-1 {
    font-size: 13px;
    width: 90%;
    margin: auto;
  }

  .description {
    font-size: 16px;
  }

  .card-serves {
    width: 100%;
    margin: 10px 0;
  }

  .containers {
    width: 100%;
    height: auto;
  }

  .card-serves {
    background: pink;
    margin-top: 0px;
    width: 90%;
  }

  .form {
    width: 90%;
  }
}
</style>
