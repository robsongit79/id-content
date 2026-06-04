// Database operations
const db = {

  // ── BRANDS ──
  async listBrands() {
    return supabase.select('brands', '?select=id,name,handle,niche,color_primary,color_secondary,color_accent,updated_at&order=updated_at.desc');
  },

  async getBrand(id) {
    const rows = await supabase.select('brands', `?id=eq.${id}&select=*`);
    return rows[0] || null;
  },

  async createBrand(data) {
    const rows = await supabase.insert('brands', data);
    return rows[0];
  },

  async updateBrand(id, data) {
    const rows = await supabase.update('brands', id, data);
    return rows[0];
  },

  async deleteBrand(id) {
    await supabase.delete('brands', id);
  },

  // ── CAROUSEL CONFIGS ──
  async getCarouselConfig(brandId) {
    const rows = await supabase.select('carousel_configs', `?brand_id=eq.${brandId}`);
    return rows[0] || null;
  },

  async saveCarouselConfig(brandId, data) {
    const existing = await this.getCarouselConfig(brandId);
    if (existing) {
      const rows = await supabase.update('carousel_configs', existing.id, data);
      return rows[0];
    } else {
      const rows = await supabase.insert('carousel_configs', { ...data, brand_id: brandId });
      return rows[0];
    }
  },

  // ── POST CONFIGS ──
  async getPostConfig(brandId) {
    const rows = await supabase.select('post_configs', `?brand_id=eq.${brandId}`);
    return rows[0] || null;
  },

  async savePostConfig(brandId, data) {
    const existing = await this.getPostConfig(brandId);
    if (existing) {
      const rows = await supabase.update('post_configs', existing.id, data);
      return rows[0];
    } else {
      const rows = await supabase.insert('post_configs', { ...data, brand_id: brandId });
      return rows[0];
    }
  },

  // ── BRAND PRESETS ──
  async listPresets(brandId) {
    return supabase.select('brand_presets', `?brand_id=eq.${brandId}&order=created_at.asc`);
  },

  async savePreset(brandId, data) {
    const existing = await supabase.select('brand_presets', `?brand_id=eq.${brandId}&name=eq.${encodeURIComponent(data.name)}&type=eq.${data.type}`);
    if (existing && existing.length > 0) {
      const rows = await supabase.update('brand_presets', existing[0].id, data);
      return rows[0];
    } else {
      const rows = await supabase.insert('brand_presets', { ...data, brand_id: brandId });
      return rows[0];
    }
  },

  async deletePreset(presetId) {
    await supabase.delete('brand_presets', presetId);
  },

  // ── PROMPT HISTORY ──
  async addHistory(brandId, type, promptText) {
    const rows = await supabase.insert('prompt_history', { brand_id: brandId, type, prompt_text: promptText });
    return rows[0];
  },

  async listHistory(brandId, limit = 10) {
    return supabase.select('prompt_history', `?brand_id=eq.${brandId}&order=created_at.desc&limit=${limit}`);
  },

  // ── FULL BRAND LOAD ──
  async loadFullBrand(id) {
    const [brand, carousel, post, presets] = await Promise.all([
      this.getBrand(id),
      this.getCarouselConfig(id),
      this.getPostConfig(id),
      this.listPresets(id),
    ]);
    return { brand, carousel, post, presets: presets || [] };
  },

  // ── SAVE ALL ──
  async saveAll(brandId, brandData, carData, postData) {
    await Promise.all([
      this.updateBrand(brandId, brandData),
      this.saveCarouselConfig(brandId, carData),
      this.savePostConfig(brandId, postData),
    ]);
  }
};
