class Account {
  final String id;
  final String name;
  final String type; // 'checking' | 'savings' | 'cash' | 'credit'
  final double balance; // JMD, signed
  final String currency; // always 'JMD'
  final String createdAt; // ISO 8601

  Account({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
    this.currency = 'JMD',
    required this.createdAt,
  });

  Account copyWith({String? name, String? type, double? balance}) => Account(
        id: id,
        name: name ?? this.name,
        type: type ?? this.type,
        balance: balance ?? this.balance,
        currency: currency,
        createdAt: createdAt,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'type': type, 'balance': balance, 'currency': currency, 'createdAt': createdAt};

  factory Account.fromJson(Map<String, dynamic> json) => Account(
        id: json['id'] as String,
        name: json['name'] as String,
        type: json['type'] as String,
        balance: (json['balance'] as num).toDouble(),
        currency: json['currency'] as String? ?? 'JMD',
        createdAt: json['createdAt'] as String,
      );
}

class Category {
  final String id;
  final String name;
  final String icon;
  final bool isCustom;
  final bool isIncome;

  Category({required this.id, required this.name, required this.icon, required this.isCustom, required this.isIncome});

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'icon': icon, 'isCustom': isCustom, 'isIncome': isIncome};

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        name: json['name'] as String,
        icon: json['icon'] as String,
        isCustom: json['isCustom'] as bool,
        isIncome: json['isIncome'] as bool,
      );
}

class Transaction {
  final String id;
  final String accountId;
  final String categoryId;
  final double amount; // JMD, signed (+income / -expense)
  final String note;
  final String date; // ISO 8601
  final String type; // 'income' | 'expense' | 'goal_contribution'
  final String? recurringRuleId;
  final String? goalId; // set when type == 'goal_contribution'

  Transaction({
    required this.id,
    required this.accountId,
    required this.categoryId,
    required this.amount,
    required this.note,
    required this.date,
    required this.type,
    this.recurringRuleId,
    this.goalId,
  });

  Transaction copyWith({String? accountId, String? categoryId, double? amount, String? note, String? date, String? type, String? goalId}) => Transaction(
        id: id,
        accountId: accountId ?? this.accountId,
        categoryId: categoryId ?? this.categoryId,
        amount: amount ?? this.amount,
        note: note ?? this.note,
        date: date ?? this.date,
        type: type ?? this.type,
        recurringRuleId: recurringRuleId,
        goalId: goalId ?? this.goalId,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'accountId': accountId,
        'categoryId': categoryId,
        'amount': amount,
        'note': note,
        'date': date,
        'type': type,
        'recurringRuleId': recurringRuleId,
        'goalId': goalId,
      };

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
        id: json['id'] as String,
        accountId: json['accountId'] as String,
        categoryId: json['categoryId'] as String,
        amount: (json['amount'] as num).toDouble(),
        note: json['note'] as String,
        date: json['date'] as String,
        type: json['type'] as String,
        recurringRuleId: json['recurringRuleId'] as String?,
        goalId: json['goalId'] as String?,
      );
}

class RecurringRule {
  final String id;
  final String name;
  final String categoryId;
  final String accountId;
  final double amount;
  final String frequency; // 'weekly' | 'biweekly' | 'monthly'
  final String nextDueDate; // ISO 8601
  final int? dayOfMonth;
  final int? dayOfWeek;

  RecurringRule({
    required this.id,
    required this.name,
    required this.categoryId,
    required this.accountId,
    required this.amount,
    required this.frequency,
    required this.nextDueDate,
    this.dayOfMonth,
    this.dayOfWeek,
  });

  RecurringRule copyWith({String? name, double? amount, String? frequency, String? nextDueDate}) => RecurringRule(
        id: id,
        name: name ?? this.name,
        categoryId: categoryId,
        accountId: accountId,
        amount: amount ?? this.amount,
        frequency: frequency ?? this.frequency,
        nextDueDate: nextDueDate ?? this.nextDueDate,
        dayOfMonth: dayOfMonth,
        dayOfWeek: dayOfWeek,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'categoryId': categoryId,
        'accountId': accountId,
        'amount': amount,
        'frequency': frequency,
        'nextDueDate': nextDueDate,
        'dayOfMonth': dayOfMonth,
        'dayOfWeek': dayOfWeek,
      };

  factory RecurringRule.fromJson(Map<String, dynamic> json) => RecurringRule(
        id: json['id'] as String,
        name: json['name'] as String,
        categoryId: json['categoryId'] as String,
        accountId: json['accountId'] as String,
        amount: (json['amount'] as num).toDouble(),
        frequency: json['frequency'] as String,
        nextDueDate: json['nextDueDate'] as String,
        dayOfMonth: json['dayOfMonth'] as int?,
        dayOfWeek: json['dayOfWeek'] as int?,
      );
}

class Goal {
  final String id;
  final String name;
  final String icon;
  final double targetAmount;
  final double currentAmount; // derived from sum of goal_contribution transactions, cached
  final String? targetDate;

  Goal({required this.id, required this.name, required this.icon, required this.targetAmount, this.currentAmount = 0, this.targetDate});

  Goal copyWith({String? name, double? targetAmount, double? currentAmount}) => Goal(
        id: id,
        name: name ?? this.name,
        icon: icon,
        targetAmount: targetAmount ?? this.targetAmount,
        currentAmount: currentAmount ?? this.currentAmount,
        targetDate: targetDate,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'icon': icon, 'targetAmount': targetAmount, 'currentAmount': currentAmount, 'targetDate': targetDate};

  factory Goal.fromJson(Map<String, dynamic> json) => Goal(
        id: json['id'] as String,
        name: json['name'] as String,
        icon: json['icon'] as String,
        targetAmount: (json['targetAmount'] as num).toDouble(),
        currentAmount: (json['currentAmount'] as num?)?.toDouble() ?? 0,
        targetDate: json['targetDate'] as String?,
      );
}

class Debt {
  final String id;
  final String name;
  final double balance;
  final double interestRate; // APR %
  final double minPayment;
  final int dueDayOfMonth;

  Debt({required this.id, required this.name, required this.balance, required this.interestRate, required this.minPayment, required this.dueDayOfMonth});

  Debt copyWith({String? name, double? balance, double? interestRate, double? minPayment}) => Debt(
        id: id,
        name: name ?? this.name,
        balance: balance ?? this.balance,
        interestRate: interestRate ?? this.interestRate,
        minPayment: minPayment ?? this.minPayment,
        dueDayOfMonth: dueDayOfMonth,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'balance': balance, 'interestRate': interestRate, 'minPayment': minPayment, 'dueDayOfMonth': dueDayOfMonth};

  factory Debt.fromJson(Map<String, dynamic> json) => Debt(
        id: json['id'] as String,
        name: json['name'] as String,
        balance: (json['balance'] as num).toDouble(),
        interestRate: (json['interestRate'] as num).toDouble(),
        minPayment: (json['minPayment'] as num).toDouble(),
        dueDayOfMonth: json['dueDayOfMonth'] as int,
      );
}

class UserSettings {
  final bool hasCompletedOnboarding;
  final double monthlyIncomeEstimate;
  final String currency; // fixed 'JMD' for v1

  UserSettings({this.hasCompletedOnboarding = false, this.monthlyIncomeEstimate = 0, this.currency = 'JMD'});

  UserSettings copyWith({bool? hasCompletedOnboarding, double? monthlyIncomeEstimate}) => UserSettings(
        hasCompletedOnboarding: hasCompletedOnboarding ?? this.hasCompletedOnboarding,
        monthlyIncomeEstimate: monthlyIncomeEstimate ?? this.monthlyIncomeEstimate,
        currency: currency,
      );

  Map<String, dynamic> toJson() => {'hasCompletedOnboarding': hasCompletedOnboarding, 'monthlyIncomeEstimate': monthlyIncomeEstimate, 'currency': currency};

  factory UserSettings.fromJson(Map<String, dynamic> json) => UserSettings(
        hasCompletedOnboarding: json['hasCompletedOnboarding'] as bool? ?? false,
        monthlyIncomeEstimate: (json['monthlyIncomeEstimate'] as num?)?.toDouble() ?? 0,
        currency: json['currency'] as String? ?? 'JMD',
      );
}
