using System;
using System.Threading.Tasks;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PlaylistOrganizerAvalonia.Infrastructure.Services;
using PlaylistOrganizerAvalonia.Exceptions;

namespace PlaylistOrganizerAvalonia.ViewModels;

/// <summary>
/// Error handling ve progress tracking için gelişmiş ViewModel
/// </summary>
public partial class ProgressViewModel : ViewModelBase
{
    private readonly IExceptionHandler _exceptionHandler;
    private readonly ILoggingService _loggingService;
    private bool _isOperationInProgress;
    private string _currentOperation = string.Empty;
    private double _progressPercentage;
    private string _statusMessage = string.Empty;
    private string _errorMessage = string.Empty;
    private bool _hasError;

    public ProgressViewModel(IExceptionHandler exceptionHandler, ILoggingService loggingService)
    {
        _exceptionHandler = exceptionHandler;
        _loggingService = loggingService;
        
        // Commands - CanExecute fonksiyonları property değişikliklerinde otomatik güncellenir
        CancelOperationCommand = new RelayCommand(CancelOperation);
        RetryOperationCommand = new RelayCommand(RetryOperation);
        ClearErrorCommand = new RelayCommand(ClearError);
    }

    // Properties
    public bool IsOperationInProgress
    {
        get => _isOperationInProgress;
        set
        {
            if (SetProperty(ref _isOperationInProgress, value))
            {
                OnPropertyChanged(nameof(CanCancel));
                OnPropertyChanged(nameof(CanRetry));
            }
        }
    }

    public string CurrentOperation
    {
        get => _currentOperation;
        set => SetProperty(ref _currentOperation, value);
    }

    public double ProgressPercentage
    {
        get => _progressPercentage;
        set => SetProperty(ref _progressPercentage, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public string ErrorMessage
    {
        get => _errorMessage;
        set
        {
            if (SetProperty(ref _errorMessage, value))
            {
                HasError = !string.IsNullOrEmpty(value);
            }
        }
    }

    public bool HasError
    {
        get => _hasError;
        set
        {
            if (SetProperty(ref _hasError, value))
            {
                OnPropertyChanged(nameof(CanRetry));
                OnPropertyChanged(nameof(CanClearError));
            }
        }
    }

    public bool CanCancel => IsOperationInProgress;
    public bool CanRetry => HasError && !IsOperationInProgress;
    public bool CanClearError => HasError;

    // Commands
    public ICommand CancelOperationCommand { get; }
    public ICommand RetryOperationCommand { get; }
    public ICommand ClearErrorCommand { get; }

    // Methods
    public async Task<T> ExecuteOperationAsync<T>(Func<Task<T>> operation, string operationName)
    {
        try
        {
            StartOperation(operationName);
            _loggingService.LogInformation($"Starting operation: {operationName}");
            
            var result = await operation();
            
            CompleteOperation($"Operation '{operationName}' completed successfully");
            _loggingService.LogInformation($"Operation completed: {operationName}");
            
            return result;
        }
        catch (OperationCanceledException)
        {
            CancelOperation();
            _loggingService.LogWarning($"Operation cancelled: {operationName}");
            throw;
        }
        catch (Exception ex)
        {
            HandleOperationError(ex, operationName);
            throw;
        }
    }

    public void StartOperation(string operationName)
    {
        CurrentOperation = operationName;
        StatusMessage = $"Starting {operationName}...";
        ProgressPercentage = 0;
        IsOperationInProgress = true;
        ClearError();
    }

    public void UpdateProgress(double percentage, string status = "")
    {
        ProgressPercentage = Math.Max(0, Math.Min(100, percentage));
        if (!string.IsNullOrEmpty(status))
        {
            StatusMessage = status;
        }
    }

    public void CompleteOperation(string message = "")
    {
        ProgressPercentage = 100;
        StatusMessage = string.IsNullOrEmpty(message) ? "Operation completed" : message;
        IsOperationInProgress = false;
        CurrentOperation = string.Empty;
    }

    public void CancelOperation()
    {
        if (IsOperationInProgress)
        {
            StatusMessage = "Operation cancelled";
            IsOperationInProgress = false;
            CurrentOperation = string.Empty;
            ProgressPercentage = 0;
            _loggingService.LogWarning("Operation cancelled by user");
        }
    }

    public void RetryOperation()
    {
        if (HasError)
        {
            ClearError();
            _loggingService.LogInformation("Retrying operation after error");
        }
    }

    public void ClearError()
    {
        ErrorMessage = string.Empty;
        HasError = false;
    }

    private void HandleOperationError(Exception exception, string operationName)
    {
        var errorMessage = $"Error in operation '{operationName}': {exception.Message}";
        ErrorMessage = errorMessage;
        StatusMessage = "Operation failed";
        IsOperationInProgress = false;
        CurrentOperation = string.Empty;
        
        _exceptionHandler.HandleException(exception, $"Operation: {operationName}");
        _loggingService.LogError($"Operation failed: {operationName}", exception);
    }
}
