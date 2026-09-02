package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.request.CreateWalletRequest;
import com.example.sharemoney.dto.request.UpdateWalletRequest;
import com.example.sharemoney.dto.response.TotalBalanceResponse;
import com.example.sharemoney.dto.response.WalletResponse;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.entity.Wallet;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.repository.WalletRepository;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock private WalletRepository walletRepository;
    @Mock private UserRepository userRepository;
    @Mock private TransactionRepository transactionRepository;

    @InjectMocks private WalletService walletService;

    private UUID userId;
    private User user;
    private Wallet wallet;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user =
                User.builder()
                        .id(userId)
                        .name("Nguyen Van A")
                        .email("vana@example.com")
                        .passwordHash("hashed")
                        .build();

        wallet =
                Wallet.builder()
                        .id(UUID.randomUUID())
                        .user(user)
                        .name("Ví chính")
                        .balance(new BigDecimal("5000000"))
                        .currency("VND")
                        .isLiability(false)
                        .build();
    }

    @Test
    @DisplayName("Lấy danh sách ví: Đã có ví -> Trả về danh sách ví")
    void testGetAllWallets_ReturnsExisting() {
        when(walletRepository.findByUser_IdAndIsLiability(userId, false))
                .thenReturn(List.of(wallet));

        List<WalletResponse> result = walletService.getAllWallets(userId);

        assertEquals(1, result.size());
        assertEquals("Ví chính", result.get(0).getName());
        assertEquals(0, new BigDecimal("5000000").compareTo(result.get(0).getBalance()));
    }

    @Test
    @DisplayName("Lấy danh sách ví: Chưa có ví -> Tự động khởi tạo ví Tiền mặt mặc định")
    void testGetAllWallets_CreatesDefaultWhenEmpty() {
        when(walletRepository.findByUser_IdAndIsLiability(userId, false))
                .thenReturn(Collections.emptyList());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(inv -> inv.getArgument(0));

        List<WalletResponse> result = walletService.getAllWallets(userId);

        assertEquals(1, result.size());
        assertEquals("Tiền mặt", result.get(0).getName());
        assertEquals(BigDecimal.ZERO, result.get(0).getBalance());
        verify(walletRepository).save(any(Wallet.class));
    }

    @Test
    @DisplayName("Lấy danh sách ví: Không tìm thấy User -> Ném USER_NOT_FOUND")
    void testGetAllWallets_UserNotFound_ThrowsException() {
        when(walletRepository.findByUser_IdAndIsLiability(userId, false))
                .thenReturn(Collections.emptyList());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        AppException ex =
                assertThrows(AppException.class, () -> walletService.getAllWallets(userId));
        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Tạo ví mới thành công")
    void testCreateWallet_Success() {
        CreateWalletRequest req = new CreateWalletRequest();
        req.setName("Tài khoản Vietcombank");
        req.setBalance(new BigDecimal("10000000"));
        req.setCurrency("VND");
        req.setBankBin("970436");
        req.setBankAccountNo("123456789");
        req.setBankAccountName("NGUYEN VAN A");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(inv -> inv.getArgument(0));

        WalletResponse response = walletService.createWallet(userId, req);

        assertNotNull(response);
        assertEquals("Tài khoản Vietcombank", response.getName());
        assertEquals(0, new BigDecimal("10000000").compareTo(response.getBalance()));
        assertEquals("970436", response.getBankBin());
    }

    @Test
    @DisplayName("Cập nhật ví: Thành công")
    void testUpdateWallet_Success() {
        UUID walletId = wallet.getId();
        UpdateWalletRequest req = new UpdateWalletRequest();
        req.setName("Ví chính đã sửa");
        req.setBankBin("970422");
        req.setBankAccountNo("987654321");
        req.setBankAccountName("NGUYEN VAN A");

        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(inv -> inv.getArgument(0));

        WalletResponse response = walletService.updateWallet(userId, walletId, req);

        assertNotNull(response);
        assertEquals("Ví chính đã sửa", response.getName());
        assertEquals("970422", response.getBankBin());
        verify(walletRepository).save(wallet);
    }

    @Test
    @DisplayName("Cập nhật ví: Không tìm thấy ví -> WALLET_NOT_FOUND")
    void testUpdateWallet_NotFound_ThrowsException() {
        UUID randomWalletId = UUID.randomUUID();
        UpdateWalletRequest req = new UpdateWalletRequest();
        req.setName("Ví mới");

        when(walletRepository.findById(randomWalletId)).thenReturn(Optional.empty());

        AppException ex =
                assertThrows(
                        AppException.class,
                        () -> walletService.updateWallet(userId, randomWalletId, req));
        assertEquals(ErrorCode.WALLET_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Cập nhật ví: Không phải chủ sở hữu -> UNAUTHORIZED")
    void testUpdateWallet_Unauthorized_ThrowsException() {
        UUID otherUserId = UUID.randomUUID();
        UUID walletId = wallet.getId();
        UpdateWalletRequest req = new UpdateWalletRequest();
        req.setName("Ví hack");

        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));

        AppException ex =
                assertThrows(
                        AppException.class,
                        () -> walletService.updateWallet(otherUserId, walletId, req));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Xóa ví: Thành công khi ví chưa có giao dịch")
    void testDeleteWallet_Success() {
        UUID walletId = wallet.getId();
        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));
        when(transactionRepository.existsByWallet_Id(walletId)).thenReturn(false);

        assertDoesNotThrow(() -> walletService.deleteWallet(userId, walletId));
        verify(walletRepository).delete(wallet);
    }

    @Test
    @DisplayName("Xóa ví: Ví đã có giao dịch -> Ném WALLET_HAS_TRANSACTIONS")
    void testDeleteWallet_HasTransactions_ThrowsException() {
        UUID walletId = wallet.getId();
        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));
        when(transactionRepository.existsByWallet_Id(walletId)).thenReturn(true);

        AppException ex =
                assertThrows(
                        AppException.class, () -> walletService.deleteWallet(userId, walletId));
        assertEquals(ErrorCode.WALLET_HAS_TRANSACTIONS, ex.getErrorCode());
        verify(walletRepository, never()).delete(any(Wallet.class));
    }

    @Test
    @DisplayName("Tính tổng số dư: Tài sản trừ Nợ phải trả (Liabilities)")
    void testGetTotalBalance_CalculatesAssetsAndLiabilities() {
        Wallet assetWallet =
                Wallet.builder()
                        .user(user)
                        .name("Tiền mặt")
                        .balance(new BigDecimal("10000000"))
                        .isLiability(false)
                        .build();

        Wallet debtWallet =
                Wallet.builder()
                        .user(user)
                        .name("Thẻ tín dụng nợ")
                        .balance(new BigDecimal("3000000"))
                        .isLiability(true)
                        .build();

        when(walletRepository.findByUser_Id(userId)).thenReturn(List.of(assetWallet, debtWallet));

        TotalBalanceResponse response = walletService.getTotalBalance(userId);

        assertNotNull(response);
        // 10,000,000 - 3,000,000 = 7,000,000
        assertEquals(0, new BigDecimal("7000000").compareTo(response.getTotalBalance()));
    }
}
