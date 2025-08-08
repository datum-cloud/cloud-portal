/**
 * CloudValid Service
 */
import { CloudValidClient } from './client';
import type {
  CreateDNSSetupRequest,
  CreateDNSSetupResponse,
  DNSSetupDetails,
  UpdateServiceRecordsRequest,
  ServiceRecordsResponse,
} from './types';

export class CloudValidService {
  private client: CloudValidClient;

  constructor(apiKey: string, apiUrl?: string) {
    this.client = new CloudValidClient(apiKey, apiUrl);
  }

  /**
   * Create DNS Setup
   */
  async createDNSSetup(
    request: CreateDNSSetupRequest
  ): Promise<{ result: CreateDNSSetupResponse }> {
    return this.client.post<{ result: CreateDNSSetupResponse }>('/dns-setup', request);
  }

  /**
   * Get DNS Setup details
   */
  async getDNSSetup(id: string): Promise<DNSSetupDetails> {
    return this.client.get<DNSSetupDetails>(`/dns-setup/${id}`);
  }

  /**
   * Get DNS Setup status
   */
  async getDNSSetupStatus(id: string): Promise<any> {
    return this.client.get(`/dns-setup/${id}/status`);
  }

  /**
   * Cancel DNS Setup
   */
  async cancelDNSSetup(id: string): Promise<{ message: string }> {
    return this.client.post<{ message: string }>(`/dns-setup/${id}/cancel`);
  }

  /**
   * List Service Records
   */
  async listServiceRecords(params?: {
    page?: number;
    per_page?: number;
    domain?: string;
  }): Promise<ServiceRecordsResponse> {
    return this.client.get<ServiceRecordsResponse>('/service-records', params);
  }

  /**
   * Update Service Records
   */
  async updateServiceRecords(request: UpdateServiceRecordsRequest): Promise<any> {
    return this.client.patch('/service-records', request);
  }
}
