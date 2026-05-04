import { request } from '../api/apiClient';

interface DesignData {
  productId: string;
  flowType: string;
  canvasJson?: any;
  designName?: string;
  thumbnail?: string;
}

interface BlankDesignData {
  productId: string;
  flowType: string;
  dimensions?: {
    width: number;
    height: number;
    unit: string;
  };
}

interface TemplateDesignData {
  productId: string;
  templateId: string;
  flowType: string;
}

class DesignService {
  // Get premium templates for a product
  async getPremiumTemplates(productId?: string, category?: string) {
    const params = new URLSearchParams();
    if (productId) params.append('productId', productId);
    if (category) params.append('category', category);
    
    return request<any>(`/designs/templates/premium?${params.toString()}`);
  }

  // Get all templates with filters
  async getTemplates(filters?: {
    flowType?: string;
    category?: string;
    isPremium?: boolean;
    productId?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.flowType) params.append('flowType', filters.flowType);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isPremium !== undefined) params.append('isPremium', String(filters.isPremium));
    if (filters?.productId) params.append('productId', filters.productId);

    return request<any>(`/designs/templates?${params.toString()}`);
  }

  // Create a blank canvas design
  async createBlankDesign(data: BlankDesignData) {
    return request<any>('/designs/blank', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Create a design from a premium template
  async createFromTemplate(data: TemplateDesignData) {
    return request<any>('/designs/from-template', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Save a design
  async saveDesign(data: DesignData) {
    return request<any>('/designs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get all user designs
  async getMyDesigns(filters?: {
    productId?: string;
    finalized?: boolean;
    savedOnly?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.productId) params.append('productId', filters.productId);
    if (filters?.finalized !== undefined) params.append('finalized', String(filters.finalized));
    if (filters?.savedOnly !== undefined) params.append('savedOnly', String(filters.savedOnly));

    return request<any>(`/designs?${params.toString()}`);
  }

  // Get design by ID
  async getDesignById(designId: string) {
    return request<any>(`/designs/${designId}`);
  }

  // Update a design
  async updateDesign(designId: string, data: any) {
    return request<any>(`/designs/${designId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Mark design as approved
  async markDesignApproved(designId: string, orderId?: string) {
    return request<any>(`/designs/${designId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ orderId }),
    });
  }
}

export default new DesignService();
