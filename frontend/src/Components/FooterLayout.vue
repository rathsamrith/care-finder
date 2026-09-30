<script setup lang="ts"></script>
<template>
  <div class="footer mt-5">
    <div class="content">
      <div class="logo_text">
        <img src="@/assets/logo/care_finder-02.png" alt="" />
        <p>
          Browse through our professionally designed selection. Browse through our professionally
          designed selection.
        </p>
      </div>
      <div class="services">
        <h4>Navigation</h4>
        <p><a href="#">Home</a></p>
        <p><a href="#">About</a></p>
        <p><a href="#">Service</a></p>
        <p><a href="#">Contact</a></p>
      </div>
      <div class="details">
        <h4 class="address">Address</h4>
        <p>BP 511, Phum Tropeang Chhuk (Borey Sorla) Sangtak, Street 371, Phnom Penh <br /></p>
      </div>
      <div class="social-media">
        <h4>Social Media</h4>
        <p>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/GitHub_Invertocat_Logo.svg/1200px-GitHub_Invertocat_Logo.svg.png"
            alt=""
          />
          <a href=""><i class="fab fa-twitter"></i>GitHub</a>
        </p>
        <p>
          <img
            src="https://cdn1.iconfinder.com/data/icons/logotypes/32/circle-linkedin-512.png"
            alt=""
          />
          <a href="#"><i class="fab fa-github"></i> Linkedin</a>
        </p>
        <p>
          <img
            src="https://img.freepik.com/premium-vector/email-symbol-white-icon_1076610-15454.jpg"
            alt=""
          />
          <a href="#"><i class="fab fa-facebook"></i>Gmail</a>
        </p>
        <p>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/1200px-Instagram_icon.png"
            alt=""
          /><a href=""><i class="fab fa-instagram"></i> Instagram</a>
        </p>
      </div>
    </div>
  </div>
</template>
<style scoped>
.footer {
  background-color: rgb(232, 245, 255);
  color: #000000;
  width: 100%;
  bottom: 0;
  left: 0;
  padding: 1rem 0;
}

.services p {
  width: 50px;
}
.footer .content {
  display: flex;
  justify-content: space-evenly;
  margin: 1.5rem;
}

.footer .content p {
  margin-bottom: 1.3rem;
}

.footer .content a {
  text-decoration: none;
  color: #000000;
}
p img {
  width: 20px;
}
.footer .content a:hover {
  border-bottom: 1px solid #971717;
}

.footer .content h4 {
  margin-bottom: 1.3rem;
  font-size: 19px;
}

footer {
  text-align: center;
  margin-bottom: 2rem;
}

footer hr {
  margin: 2rem 0;
}
.details {
  width: 100px;
}
.logo_text {
  width: 200px;
}
.logo_text img {
  width: 200px;
}
@media (max-width: 767px) {
  .footer .content {
    display: flex;
    flex-wrap: wrap;
    font-size: 14px;
  }

  .footer {
    position: unset;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .footer .content,
  .footer {
    font-size: 14px;
  }
}

@media (orientation: landscape) and (max-height: 500px) {
  .footer {
    position: unset;
  }
}
</style>
