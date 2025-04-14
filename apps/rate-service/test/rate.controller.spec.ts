import { Test, TestingModule } from '@nestjs/testing';
import { RateController } from '../src/rate.controller';
import { RateService } from '../src/rate.service';
import { CoinRate } from '../../../libs/shared/src/interfaces/rate.interface';

describe('RateController', () => {
  let controller: RateController;
  let service: RateService;

  const mockRateService = {
    getAllRates: jest.fn(),
    getRatesByIds: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RateController],
      providers: [
        {
          provide: RateService,
          useValue: mockRateService,
        },
      ],
    }).compile();

    controller = module.get<RateController>(RateController);
    service = module.get<RateService>(RateService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRates', () => {
    it('should get all rates when no ids are provided', async () => {
      const vsCurrency = 'usd';
      const mockRates: CoinRate[] = [
        {
          id: 'bitcoin',
          currencyRateMap: { usd: 65000 },
          lastUpdated: '2023-12-15T12:00:00Z',
        },
        {
          id: 'ethereum',
          currencyRateMap: { usd: 3500 },
          lastUpdated: '2023-12-15T12:00:00Z',
        },
      ];

      mockRateService.getAllRates.mockResolvedValue(mockRates);

      const result = await controller.getRates(undefined, vsCurrency);
      expect(result).toEqual(mockRates);
      expect(service.getAllRates).toHaveBeenCalledWith({
        vsCurrencies: vsCurrency,
      });
    });

    it('should get rates for specific coin ids', async () => {
      const ids = 'bitcoin,ethereum';
      const vsCurrency = 'usd';
      const coinIds = ['bitcoin', 'ethereum'];
      const mockRates: CoinRate[] = [
        {
          id: 'bitcoin',
          currencyRateMap: { usd: 65000 },
          lastUpdated: '2023-12-15T12:00:00Z',
        },
        {
          id: 'ethereum',
          currencyRateMap: { usd: 3500 },
          lastUpdated: '2023-12-15T12:00:00Z',
        },
      ];

      mockRateService.getRatesByIds.mockResolvedValue(mockRates);

      const result = await controller.getRates(ids, vsCurrency);
      expect(result).toEqual(mockRates);
      expect(service.getRatesByIds).toHaveBeenCalledWith(coinIds, {
        vsCurrencies: vsCurrency,
      });
    });

    it('should use default currency (usd) when not specified', async () => {
      const ids = 'bitcoin,ethereum';
      const coinIds = ['bitcoin', 'ethereum'];
      const mockRates: CoinRate[] = [
        {
          id: 'bitcoin',
          currencyRateMap: { usd: 65000 },
          lastUpdated: '2023-12-15T12:00:00Z',
        },
        {
          id: 'ethereum',
          currencyRateMap: { usd: 3500 },
          lastUpdated: '2023-12-15T12:00:00Z',
        },
      ];

      mockRateService.getRatesByIds.mockResolvedValue(mockRates);

      const result = await controller.getRates(ids);
      expect(result).toEqual(mockRates);
      expect(service.getRatesByIds).toHaveBeenCalledWith(coinIds, {
        vsCurrencies: 'usd',
      });
    });

    it('should handle service errors gracefully', async () => {
      const ids = 'bitcoin,ethereum';
      mockRateService.getRatesByIds.mockRejectedValue(new Error('Service error'));
      mockRateService.getRatesByIds.mockResolvedValueOnce(null);

      const result = await controller.getRates(ids);
      expect(result).toBeNull();
    });
  });
}); 