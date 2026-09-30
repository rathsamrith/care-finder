<script setup lang="ts">
import WebLayout from '@/Components/Layouts/WebLayout.vue'
import FooterLayout from '@/Components/FooterLayout.vue'
</script>
<template>
  <WebLayout>
    <div class="head">
      <h1>About Us</h1>
      <h5>Full service starting from 2023</h5>
      <button>Detail About Service</button>
    </div>
    <div class="container-top">
      <div class="container-img">
        <div class="one_img">
          <img
            class=""
            src="https://static1.anpoimages.com/wordpress/wp-content/uploads/2022/07/googleMapsTricksHero.jpg"
            alt=""
          />
        </div>
        <div class="two_img">
          <img
            class=""
            src="https://i.pinimg.com/564x/45/1d/b1/451db155874786bd0ba76bee971ac657.jpg"
            alt=""
          />
          <img
            class=""
            src="https://i.pinimg.com/564x/2a/02/2a/2a022aa6d29aee0bbff11108947310b5.jpg"
            alt=""
          />
        </div>
      </div>
      <div class="container_text">
        <h3 class="fs-1">We are a service to help you find a hospital near you</h3>
        <p>
          For my services can make it easy for you to find a hospital near you and you have used the
          service for hospital reservations and booking all the services available in the booked
          hospital. Especially, you can check the hospital before you booking.
        </p>
      </div>
    </div>
    <div class="card-todo mt-5">
      <h2>What We Do</h2>
      <div class="group-card d-flex justify-content-evenly mt-4">
        <div class="p-4 card_hospital">
          <div class="card_noe">
            <img src="https://cdn-icons-png.flaticon.com/512/12110/12110712.png" alt="..." />
            <div class="card-body">
              <h2>Hospital Service</h2>
              <p>
                we manage all hospital that you our service that customer can find ton our website
              </p>
            </div>
          </div>
        </div>
        <div class="p-3 card_hospital">
          <div class="card_two">
            <img
              src="../../../src/assets/image/d7b3a7ae-ce62-4a2e-ad5f-9817a390a789.png"
              class=""
              alt="..."
            />
            <div class="card-body">
              <h2>Customer Service</h2>
              <p>
                Customer can create account fo r use our website and can help customer easier to
                find hospital than before
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card_contact">
      <div class="card_text">
        <h3 class="fw-bold">
          If you have any questions about our services or you want to use our services, you can
          contact us.
        </h3>
        <button type="button" class="ml-5 text-light">Contact Us</button>
      </div>
      <img src="https://i.pinimg.com/564x/c2/87/c8/c287c8abe56b65b73da4685e15c896be.jpg" alt="" />
    </div>
    <FooterLayout />
  </WebLayout>
</template>
<style>
body {
  background-color: #f4f9ff;
}
.head {
  height: 80vh;
  background-image: url('https://healthnewshub.org/wp-content/uploads/2019/03/doctors-day.jpg');
  background-size: cover;
  background-position: center;
  background-color: rgba(0, 128, 128, 0.578);
  padding: 4% 20px 20px 10%;
  color: rgb(40, 27, 3);
  font-weight: bold;
  filter: blur(0.5);
}

h1 {
  font-size: 50px;
  margin-bottom: 10px;
}

button {
  background-color: rgb(1, 173, 253);
  color: white;
  padding: 10px;
  margin-top: 30px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.head h1 {
  margin-top: 70px;
}
.container-top {
  display: flex;
  margin-top: 10px;
}
.container-img {
  width: 50%;
}
.one_img img {
  width: 600px;
}
.two_img {
  display: flex;
  flex-direction: row;
  gap: 20px;
}
.two_img img {
  width: 290px;
  margin-top: 10px;

  display: flex;
  flex-direction: row;
}
.container_text {
  width: 50%;
  padding: 20px;
  text-align: center;
  margin-top: 200px;
}

.card-todo {
  text-align: center;
  padding: 10px;
  margin: 10px;
}
.group-card {
  display: flex;
  gap: 10px;
  color: white;
}
.card_noe img {
  width: 100px;
  border-radius: 100px;
  border: 1px solid #e3c532;
  box-shadow: 0 0 10px rgba(255, 238, 86, 0.837);
}
.card_two img {
  width: 100px;
  border-radius: 100px;
  border: 1px solid #e3c532;
  box-shadow: 0 0 20px rgba(255, 238, 86, 0.837);
}

.card_hospital {
  margin-top: 10px;
  margin-bottom: 10px;
  background: #ffffff;
  border: 1px solid orange;
  border-radius: 10px;
  color: black;
}
.card_contact {
  display: flex;
}
.card_text {
  margin-top: 150px;
  text-align: center;
}

@media screen and (min-width: 768px) and (max-width: 1024px) {
  .container-top {
    flex-direction: column;
  }
  .container-img {
    width: 50%;
  }
  .one_img img {
    width: 680px;
  }

  .two_img img {
    width: 330px;
  }
  .container_text {
    width: 100%;
    margin-bottom: -20px;
  }
  .card_text h3 {
    font-size: 20px;
  }
  .card_contact {
    margin: bottom 20px;
  }
  .card_contact img {
    width: 400px;
  }
}
@media screen and (max-width: 767px) {
  .container-top {
    flex-direction: column;
  }
  .container-img,
  .one_img img {
    width: 480px;
  }

  .container-img,
  .two_img img {
    width: 230px;
  }
  .container_text {
    width: 100%;
    margin-bottom: -20px;
  }
  .group-card {
    height: 45vh;
  }

  .card_contact {
    flex-direction: column;
    height: 130vh;
  }
  .card-body h2 {
    font-size: 20px;
  }
  .card-body p {
    font-size: 12px;
  }
  .card_text {
    margin-top: 50px;
  }
}
</style>
