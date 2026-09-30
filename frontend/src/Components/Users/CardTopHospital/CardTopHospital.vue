<template>
  <div>
    <h1>Top Hospitals</h1>
    <el-scrollbar>
      <div class="marquee-wrapper" style="user-select: none">
        <div class="marquee-content scrollingX">
          <div
            v-for="card in cards"
            :key="card.hospital.id + 'duplicate'"
            class="card-testimonial w-100"
            @click="seeDetails(card.hospital.id)"
          >
            <article>
              <picture>
                <source
                  media="(min-width: 768px)"
                  :srcset="
                    card.hospital.cover_image != 'No cover'
                      ? card.hospital.cover_image
                      : 'https://i0.wp.com/sunrisedaycamp.org/wp-content/uploads/2020/10/placeholder.png?ssl=1'
                  "
                />
                <img
                  v-if="card.hospital.cover_image !== 'No cover'"
                  :src="card.hospital.cover_image"
                  alt=""
                />
              </picture>
              <h4>{{ card.hospital.name }}</h4>
              <article class="short-description">
                <p>Open {{ card.hospital.open_time }} to {{ card.hospital.close_time }}</p>
                <p>{{ card.hospital.province }}</p>
                <el-rate
                  v-model="card.total_star"
                  disabled
                  :texts="['oops', 'disappointed', 'normal', 'good', 'great']"
                  show-text
                />
              </article>
            </article>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { hospitalDetailStore } from '@/stores/hospital-detail'

export default defineComponent({
  name: 'CardTopHospital',
  methods: {
    seeDetails(id: number) {
      this.$router.push(`/hospital/detail?id=${id}`)
      this.details.fetchHospitalDetail(id)
    }
  },
  data() {
    return {
      details: hospitalDetailStore(),
      value: 4
    }
  },
  props: ['cards']
})
</script>

<style scoped>
h1 {
  color: rgb(0, 0, 0);
  text-align: center;
  margin-bottom: 30px;
  margin-top: 50px;
}

body {
  align-items: center;
  background: #e3e3e3;
  display: flex;
  height: 100vh;
  justify-content: center;
}

.marquee-wrapper {
  position: relative;
  display: flex;
  overflow: hidden;
  gap: 1rem;
  border-radius: 1rem;
  padding: 10px;
  width: 100%;
  max-width: 100%;
}

.marquee-wrapper .marquee-content {
  display: flex;
  flex-shrink: 0;
  gap: 1rem;
}

.marquee-wrapper .marquee-content .card-testimonial {
  max-width: 300px;
  background-color: #ffffff;
  box-shadow: 0 0 10px #37c0ff85;
  text-align: center;
  padding: 1rem;
  border-radius: 1rem;
  color: #000000;
}

.marquee-wrapper .marquee-content .card-testimonial article picture {
  position: relative;
  min-width: 200px;
}

.marquee-wrapper .marquee-content .card-testimonial article picture img {
  width: 100%;
  height: 200px;
  border-radius: 0.5rem;
  object-fit: cover;
  object-position: 50% 15%;
}

.marquee-wrapper .marquee-content .card-testimonial article h4 {
  font-size: 20px;
  text-transform: capitalize;
  margin-block: 1rem;
}

.marquee-wrapper .marquee-content .card-testimonial article article.short-description p {
  font-size: 14px;
  line-height: 20px;
  margin-bottom: 1.2rem;
}

.marquee-wrapper:hover .marquee-content {
  animation-play-state: paused;
}
</style>
