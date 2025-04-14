import { Test, TestingModule } from '@nestjs/testing';
import { BalanceController } from '../src/balance.controller';
import { BalanceService } from '../src/balance.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AddBalanceDto } from '../src/dto/add-balance.dto';
import { UpdateBalanceDto } from '../src/dto/update-balance.dto';
import { RebalanceDto } from '../src/dto/rebalance.dto';

describe('BalanceController', () => {
  let controller: BalanceController;
  let service: BalanceService;

  const mockBalanceService = {
    getBalances: jest.fn(),
    getBalanceById: jest.fn(),
    addBalance: jest.fn(),
    updateBalance: jest.fn(),
    removeBalance: jest.fn(),
    getTotalBalance: jest.fn(),
    getPortfolioAllocation: jest.fn(),
    rebalance: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalanceController],
      providers: [
        {
          provide: BalanceService,
          useValue: mockBalanceService,
        },
      ],
    }).compile();

    controller = module.get<BalanceController>(BalanceController);
    service = module.get<BalanceService>(BalanceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBalances', () => {
    it('should throw BadRequestException if userId is not provided', async () => {
      await expect(controller.getBalances('')).rejects.toThrow(BadRequestException);
    });

    it('should return balances for a user', async () => {
      const userId = 'user1';
      const mockBalances = [
        { balanceId: 'balance1', asset: 'bitcoin', amount: 1.5, assetMetadata: { symbol: 'BTC' } },
        { balanceId: 'balance2', asset: 'ethereum', amount: 5.0, assetMetadata: { symbol: 'ETH' } },
      ];

      mockBalanceService.getBalances.mockResolvedValue(mockBalances);

      const result = await controller.getBalances(userId);
      expect(result).toEqual(mockBalances);
      expect(service.getBalances).toHaveBeenCalledWith(userId);
    });

    it('should handle errors from service', async () => {
      const userId = 'user1';
      mockBalanceService.getBalances.mockRejectedValue(new Error('Service error'));

      await expect(controller.getBalances(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBalanceById', () => {
    it('should throw BadRequestException if userId is not provided', async () => {
      await expect(controller.getBalanceById('', 'balance1')).rejects.toThrow(BadRequestException);
    });

    it('should return a specific balance', async () => {
      const userId = 'user1';
      const balanceId = 'balance1';
      const mockBalance = {
        balanceId,
        asset: 'bitcoin',
        amount: 1.5,
        assetMetadata: { symbol: 'BTC' },
      };

      mockBalanceService.getBalanceById.mockResolvedValue(mockBalance);

      const result = await controller.getBalanceById(userId, balanceId);
      expect(result).toEqual(mockBalance);
      expect(service.getBalanceById).toHaveBeenCalledWith(userId, balanceId);
    });

    it('should handle errors from service', async () => {
      const userId = 'user1';
      const balanceId = 'balance1';
      mockBalanceService.getBalanceById.mockRejectedValue(new Error('Service error'));

      await expect(controller.getBalanceById(userId, balanceId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addBalance', () => {
    it('should throw BadRequestException if userId is not provided', async () => {
      const dto: AddBalanceDto = { asset: 'bitcoin', amount: 1.5 };
      await expect(controller.addBalance('', dto)).rejects.toThrow(BadRequestException);
    });

    it('should add a new balance', async () => {
      const userId = 'user1';
      const dto: AddBalanceDto = { asset: 'bitcoin', amount: 1.5 };
      const mockBalance = {
        balanceId: 'newBalance',
        asset: dto.asset,
        amount: dto.amount,
        assetMetadata: { symbol: 'BTC' },
      };

      mockBalanceService.addBalance.mockResolvedValue(mockBalance);

      const result = await controller.addBalance(userId, dto);
      expect(result).toEqual(mockBalance);
      expect(service.addBalance).toHaveBeenCalledWith(userId, dto.asset, dto.amount);
    });

    it('should handle errors from service', async () => {
      const userId = 'user1';
      const dto: AddBalanceDto = { asset: 'bitcoin', amount: 1.5 };
      mockBalanceService.addBalance.mockRejectedValue(new Error('Service error'));

      await expect(controller.addBalance(userId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBalance', () => {
    it('should throw BadRequestException if userId is not provided', async () => {
      const dto: UpdateBalanceDto = { amount: 2.5 };
      await expect(controller.updateBalance('', 'balance1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should update a balance', async () => {
      const userId = 'user1';
      const balanceId = 'balance1';
      const dto: UpdateBalanceDto = { amount: 2.5 };
      const mockBalance = {
        balanceId,
        asset: 'bitcoin',
        amount: dto.amount,
        assetMetadata: { symbol: 'BTC' },
      };

      mockBalanceService.updateBalance.mockResolvedValue(mockBalance);

      const result = await controller.updateBalance(userId, balanceId, dto);
      expect(result).toEqual(mockBalance);
      expect(service.updateBalance).toHaveBeenCalledWith(userId, balanceId, dto.amount);
    });

    it('should handle errors from service', async () => {
      const userId = 'user1';
      const balanceId = 'balance1';
      const dto: UpdateBalanceDto = { amount: 2.5 };
      mockBalanceService.updateBalance.mockRejectedValue(new Error('Service error'));

      await expect(controller.updateBalance(userId, balanceId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeBalance', () => {
    it('should throw BadRequestException if userId is not provided', async () => {
      await expect(controller.removeBalance('', 'balance1')).rejects.toThrow(BadRequestException);
    });

    it('should remove a balance', async () => {
      const userId = 'user1';
      const balanceId = 'balance1';
      
      mockBalanceService.removeBalance.mockResolvedValue(balanceId);

      const result = await controller.removeBalance(userId, balanceId);
      expect(result).toEqual({ balanceId });
      expect(service.removeBalance).toHaveBeenCalledWith(userId, balanceId);
    });

    it('should handle errors from service', async () => {
      const userId = 'user1';
      const balanceId = 'balance1';
      mockBalanceService.removeBalance.mockRejectedValue(new Error('Service error'));

      await expect(controller.removeBalance(userId, balanceId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTotalBalance', () => {
    it('should throw BadRequestException if userId is not provided', async () => {
      await expect(controller.getTotalBalance('', 'usd')).rejects.toThrow(BadRequestException);
    });

    it('should return total balance in specified currency', async () => {
      const userId = 'user1';
      const currency = 'usd';
      const mockTotal = {
        total: 65000,
        currency: 'usd',
      };

      mockBalanceService.getTotalBalance.mockResolvedValue(mockTotal);

      const result = await controller.getTotalBalance(userId, currency);
      expect(result).toEqual(mockTotal);
      expect(service.getTotalBalance).toHaveBeenCalledWith(userId, currency.toLowerCase());
    });

    it('should handle errors from service', async () => {
      const userId = 'user1';
      const currency = 'usd';
      mockBalanceService.getTotalBalance.mockRejectedValue(new Error('Service error'));

      await expect(controller.getTotalBalance(userId, currency)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPortfolioAllocation', () => {
    it('should throw BadRequestException if userId is not provided', async () => {
      await expect(controller.getPortfolioAllocation('')).rejects.toThrow(BadRequestException);
    });

    it('should return portfolio allocation percentages', async () => {
      const userId = 'user1';
      const mockAllocation = {
        bitcoin: 60,
        ethereum: 40
      };

      mockBalanceService.getPortfolioAllocation.mockResolvedValue(mockAllocation);

      const result = await controller.getPortfolioAllocation(userId);
      expect(result).toEqual(mockAllocation);
      expect(service.getPortfolioAllocation).toHaveBeenCalledWith(userId);
    });

    it('should handle errors from service', async () => {
      const userId = 'user1';
      mockBalanceService.getPortfolioAllocation.mockRejectedValue(new Error('Service error'));

      await expect(controller.getPortfolioAllocation(userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('rebalance', () => {
    it('should throw BadRequestException if userId is not provided', async () => {
      const dto: RebalanceDto = { targetPercentages: { bitcoin: 50, ethereum: 50 } };
      await expect(controller.rebalance('', dto)).rejects.toThrow(BadRequestException);
    });

    it('should rebalance portfolio as specified', async () => {
      const userId = 'user1';
      const dto: RebalanceDto = { targetPercentages: { bitcoin: 50, ethereum: 50 } };
      const mockBalances = [
        { balanceId: 'balance1', asset: 'bitcoin', amount: 0.5, assetMetadata: { symbol: 'BTC' } },
        { balanceId: 'balance2', asset: 'ethereum', amount: 8.0, assetMetadata: { symbol: 'ETH' } },
      ];

      mockBalanceService.rebalance.mockResolvedValue(mockBalances);

      const result = await controller.rebalance(userId, dto);
      expect(result).toEqual(mockBalances);
      expect(service.rebalance).toHaveBeenCalledWith(userId, dto.targetPercentages);
    });

    it('should handle errors from service', async () => {
      const userId = 'user1';
      const dto: RebalanceDto = { targetPercentages: { bitcoin: 50, ethereum: 50 } };
      mockBalanceService.rebalance.mockRejectedValue(new Error('Service error'));

      await expect(controller.rebalance(userId, dto)).rejects.toThrow(BadRequestException);
    });
  });
}); 